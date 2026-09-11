// =============================================================
// docx-parse —— Word(.docx)账单 → 文本 → 现有解析链
//
// 起因(2026-09-11):微信/支付宝导出的账单被转存成 Word 后,上传页直接拒收。
// .docx 本质是个 zip:正文在 word/document.xml。账单类 docx 结构高度规整 ——
// 每张表一行一笔交易、每格一个字段(交易时间 / 收或支 / 金额 / 交易对方…),
// 因此可以不解压成"读懂文档",只做三件事:
//   ① 解压取 document.xml   ② 按表头定位列(不写死列序)
//   ③ 序列化成「时间 / 商户 / 收支+金额」三行,交给 paste-parse
// 与"复制粘贴""截图 OCR"共用同一条解析链,**不新写第二套识别逻辑**。
//
// 实测过的真实样本(微信"交易明细证明"转 Word):
//   8 张表 / 187 行,184 行是 8 格的数据行;表头(交易单号/交易时间/交易类型/
//   收-支-其他/交易方式/金额(元)/交易对方/商户单号)只在第 1 张表出现一次,
//   后面 7 张表不重复表头 —— 所以列映射必须**跨表沿用**。
//   且 PDF→Word 的转换会在中文词中间塞空格("湖南文理学 院"),商户名必须归一化,
//   否则同一个商户会因为断行位置不同被拆成多个订阅(引擎按「商户+金额」分组)。
//
// 只支持 .docx(OOXML)。老版 .doc 是 OLE 二进制,浏览器里读不了 —— 给明确出路。
// =============================================================
import { strFromU8, unzipSync } from "fflate";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/** 老版 .doc(OLE2 复合文档)文件头 —— 命中即说明这不是 docx,给人话提示 */
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const FULL_DATE = /(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/;
/** 金额单元格:¥1,234.00 / 1234.00 元 这类,整格就是一个数 */
const AMOUNT_CELL = /^[¥￥]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\s*元?$/;
const DIR_CELL = /^(收入|支出|其他|收|支)$/;

interface Cols {
  time: number;
  amount: number;
  dir: number;
  name: number;
}

/* ---------- XML → 文本(用 DOMParser,比手写正则稳:实体、嵌套、命名空间都交给它) ---------- */

/** 元素内全部 w:t 文本(段落/单元格通用) */
function nodeText(el: Element): string {
  return Array.from(el.getElementsByTagNameNS(W_NS, "t"))
    .map((t) => t.textContent ?? "")
    .join("");
}

/** 单元格文本:段内直接相连(Word 会把一句话切成多个 run),段间用空格 */
function cellText(tc: Element): string {
  const paras = Array.from(tc.children).filter((c) => c.localName === "p");
  return paras
    .map((p) => nodeText(p))
    .filter((s) => s.trim() !== "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function rowCells(tr: Element): string[] {
  return Array.from(tr.children)
    .filter((c) => c.localName === "tc")
    .map(cellText);
}

/**
 * 商户名归一化:
 *   ① 去掉中文词中间的空格(PDF 转 Word 的断行痕迹:"湖南文理学 院" → "湖南文理学院")
 *   ② 去掉夹进来的长数字串(商户单号被并进同一格:"界富种养合作社刘有军 5007497085")
 *   ③ 收拢竖线两侧空格
 * 不做这一步,同一个商户会因断行位置不同被当成不同商户,周期规律直接失效。
 */
export function normalizeMerchant(raw: string): string {
  return raw
    .replace(/([一-鿿])\s+(?=[一-鿿])/g, "$1")
    .replace(/\s*\|\s*/g, "|")
    .split(/\s+/)
    .filter((tok) => !/^\d{6,}$/.test(tok))
    .join(" ")
    .trim();
}

/** 表头行 → 列映射(找不到表头返回 null) */
function readHeader(cells: string[]): Cols | null {
  const pick = (...pats: RegExp[]): number => {
    for (const re of pats) {
      const i = cells.findIndex((c) => re.test(c));
      if (i >= 0) return i;
    }
    return -1;
  };
  const time = pick(/交易时间/, /^时间$/);
  const amount = pick(/金额/);
  const dir = pick(/收\s*\/\s*支/, /收支/);
  const name = pick(/交易对方/, /对方/);
  if (time < 0 || amount < 0 || dir < 0 || name < 0) return null;
  return { time, amount, dir, name };
}

/**
 * 交易类型词 —— **不能当商户名**。启发式那一列最容易踩的坑就是它:
 * 「商户消费」四个字比「爱奇艺」三个字长,按"最长的那格"选必然选错。
 */
const TYPE_WORD = /(消费|转账|付款|提现|充值|还款|收款|退款|红包|收入|支出|其他)$/;

/** 没有表头可依时的兜底:按单元格内容认列(其它平台的 Word 导出可能没有表头) */
function guessCols(cells: string[]): Cols | null {
  const time = cells.findIndex((c) => FULL_DATE.test(c));
  const amount = cells.findIndex((c) => AMOUNT_CELL.test(c));
  const dir = cells.findIndex((c) => DIR_CELL.test(c));
  if (time < 0 || amount < 0 || dir < 0) return null;
  // 商户:取**最右**一个含中文、且不是交易类型词的格子。
  // 微信/支付宝的列序里「交易对方」都排在交易方式之后、商户单号(纯数字)之前,
  // 所以"最右的中文格"比"最长的中文格"稳(后者会被「商户消费」这种类型词骗走)。
  let name = -1;
  cells.forEach((c, i) => {
    if (i === time || i === amount || i === dir) return;
    if (!/[一-鿿]/.test(c)) return;
    if (TYPE_WORD.test(c)) return;
    name = i;
  });
  if (name < 0) return null;
  return { time, amount, dir, name };
}

/** 一行 → paste-parse 能吃的三行文本(时间 / 商户 / 收支+金额);不是交易行返回 null */
function txLines(cells: string[], cols: Cols): string[] | null {
  const at = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : "");
  const time = at(cols.time);
  const amount = at(cols.amount);
  const dir = at(cols.dir);
  const name = normalizeMerchant(at(cols.name));

  if (!FULL_DATE.test(time)) return null;
  if (!AMOUNT_CELL.test(amount.replace(/\s/g, ""))) return null;
  // 方向认不出就整行跳过:**宁可少一笔,也不把收入当成支出**
  if (!DIR_CELL.test(dir)) return null;
  // 商户空着也跳过:否则 paste-parse 会向上抓到上一笔的商户,张冠李戴
  if (!name) return null;

  return [time, name, `${dir} ${amount.replace(/\s/g, "")}`];
}

/**
 * .docx → 账单文本。
 * 抛错 = 打不开/不是账单(上传页转失败态);不抛错就一定拿到了可解析的文本。
 */
export function docxToText(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  if (OLE_MAGIC.every((b, i) => bytes[i] === b)) {
    throw new Error("这是旧版 .doc(二进制格式),浏览器里读不了。用 Word 打开后「另存为 .docx」,或直接全选账单文本复制粘贴。");
  }

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("打不开这个文件。请确认是从 Word 另存的 .docx(而不是改了扩展名的其它格式)。");
  }
  const docXml = files["word/document.xml"];
  if (!docXml) throw new Error("这份文档里没有正文,可能不是 Word 文档。");

  const doc = new DOMParser().parseFromString(strFromU8(docXml), "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("文档内容解析失败,文件可能已损坏。");
  const body = doc.getElementsByTagNameNS(W_NS, "body")[0];
  if (!body) throw new Error("读不到文档正文,文件可能已损坏。");

  const head: string[] = []; // 表格外的正文(标题/说明)—— 里面通常写着"微信支付"或"支付宝",平台识别要用
  const txs: string[] = [];
  let cols: Cols | null = null; // 跨表沿用(实测后面几张表不重复表头)

  for (const node of Array.from(body.children)) {
    if (node.localName === "p") {
      const t = nodeText(node).replace(/\s+/g, " ").trim();
      if (t && head.length < 30) head.push(t);
      continue;
    }
    if (node.localName !== "tbl") continue;

    for (const tr of Array.from(node.children)) {
      if (tr.localName !== "tr") continue;
      const cells = rowCells(tr);
      if (cells.length < 3) continue; // 1~2 格的是标题/说明行

      const header = readHeader(cells);
      if (header) {
        cols = header;
        continue; // 表头行本身不是交易
      }
      const use = cols ?? guessCols(cells);
      if (!use) continue;
      const tx = txLines(cells, use);
      if (tx) txs.push(...tx);
    }
  }

  if (!txs.length) {
    throw new Error(
      "这份 Word 里没有找到可识别的交易表格。需要包含「交易时间 / 金额 / 交易对方」这几列的明细表;若账单是截图或 PDF,请改用截图识别或直接复制文本粘贴。",
    );
  }

  // 头部正文放在最前(paste-parse 靠它判平台),交易三行一组依次排开
  return [...head, ...txs].join("\n");
}
