// La firma "Juan Valdez" (solo las letras, sin el recuadro ni "Café") para estamparla
// en el arte de la Ruta del café. Sale del logo oficial reducido a 182x35 con 16 niveles
// de opacidad; al dibujarla se remuestrea con antialias y se mezcla sobre lo que ya hay,
// porque a tamaño de pixel art un trazo duro de 1 px deja la letra cursiva ilegible.

import type { Color, PixelBuffer } from "./buffer.ts";

const LW = 182;
const LH = 35;
const PACKED =
  "AAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAACWc6xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFIzv//+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSd//////gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAB5EAAAAAAA" +
  "AAAgAAAAAAAAKrUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUnf//////+hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAs6hAAAAAAAA" +
  "AG/7AAAAAAAABM6hAAAAAAAJ//MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA43///////2DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "r/+QAAAAAAAADP/hAAAAAAAB3/9AAAAAAAC/72AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABb////////thAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAe//4QAAAAAAAE//0QAAAAAAAe//QAAAAAAAz/9wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABM/////////hAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAHv//QAAAAAAACv/6AAAAAAAAHv/0AAAAAAAN//YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC7//////u//4g" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB3//4AAAAAAAC7/9AAAAAAAAB7/8wAAAAAADf/1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABP" +
  "////2mKP//MAOpIAAAAAAAAAAAAANRAAAAEAAAAAAAAAAL///AAAAAAABv/8AAAAAAAAAu//MAAAAAAAz/9AAAAAADZ2IAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAHP/rdBAAj//zAM/9EAAAAAAAAAAAO//SAABtwwAAAAAAAAB///8wAAAAAAv/9wAAAAAAAALv/zAAAAAAAL//MAAAAFz//+cAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAF1IAAAAI//8wHf/0AAB4EAAAAABO//9wAE//sAKMxgAAAAP///cAAAAAAv/+IAAABrtQAC7/8wAAAAAACv/iAAAA" +
  "j/////QAAAAAAAAAAAABEAAAAAAAAAAAAAAAAAAACP//MB3/8wAF/2AAAAAD7///oACP/8A9//+gAAAAz//7AAAAAAf/+gAAAb//8gAu//MAAA" +
  "AAAAv/0QAAGv/////5AAAAAAAAAAJZveogAAAAAAAAAAAAAAAAAAj//zAd/+IADP+QAAAALf///7AAn//U7///9wAAAH///hAAAAAM//UAABz/" +
  "//YALv/zAAAAAAA+/8AAAL///lX/+gAAAAAAAVnP////oAAAAAAAAAAAAAAAAAAI//8wHv/RAD//oAAAAL//vv+wAJ////////sAAAAu//9QAA" +
  "AAL//RAAC////4AC//8wAAAAAE3/+wAAn//8IG//oAAAAAJr7//////8AAAAAAAAAAAAAAAAAACP//IB7/wAB//5AAAAn/5Qb/wACf///9r//7" +
  "AAAACv//kAAAAH//gAAJ//3/+AAv//MAAAACn///oABf//sQLv/4AAACa+////////+QAAAAAAAAAAAAAAAAAAj//hAe/8AAr/+QAABf/1AF/8" +
  "AAr///4gf/+wAAAAT//9AAAAC//zAAb/9x3/kAL//zAAAAfv///5AB3/+xAs//9AAErv/////////9IAAAAAAAAAAAAAAAAAAI//0QHv/AAL//" +
  "kAAB7/gACv+wAK///2AC7/wAAAAA3//zAAAC7/wAA//2AN/5AC//8wAAK/////+QBv/+ID3//8AAf//////s////wgAAAAAAAAAAAAAAAAAACP" +
  "/8AB7/wADP/5AACv/RAD//sACv//wAAe/8AAAAAH//9wAABv/3ABz/kALv+QA///MAA9//vv//kAr/+APf//4wAv/////HKP//+QAAAAAAAAAA" +
  "AAAAAAAAAAj/+gAe/8AAz/+QAE//YAC//7AAv//2AALv/RAAAAAv//sAAAr/8gCP/RAG//kAP//zAD7/5Ar//6AN//M+///1AAHv//6kAJ///m" +
  "AAAAAAAAAAAAAAAAAAAAAI//gAHv/AAN//kAC//hAF///AAL//8gAC//4QAAAAC//+IAAe/7AD//UADP/4AD//8wTv/SAN///AHv/67//+QAAA" +
  "j/xyACz//8MAAAA1QQAAAAAAAAAAAAAACv/2AB3/wAHv/3AD//kAHf//0QC//8AAA///MAAAAAb//2AAX/9wCv/QAG//+QA///I+/9IAf///0C" +
  "7/////sgAAAAMwAATf//kQAAON//sAAhAAAAAAAAAAAAv/9AAN/+EE//9gCf/2AJ////MAv/+gAAT//0AAAAAC7/+gAJ//ID//gALv//oAP//4" +
  "7/0gA+///+Ee////5wAAAAAAAAB///9wABa////+EK7qIAAAAAAAAAAd/+IADP/6bf//cAz/9wj////2AM//kAAE//9gAAAAAK//0QHf+wCf/1" +
  "AL///8AD/////jAC3////zDP//+jAAAAAAAAAa///TADjf////+wHv/9IAAAAAAAAAP//AAAr//////+ef//7f////+QDP/4AABf//kAAAAABP" +
  "//QE//YB3/9Qn////iA////+QALP/4z/9Qj///zMymEAAAADz//6EErv/////rIAr//8EAAAAAAAAH//kAAI/////////////+bv//kAz/9wAA" +
  "b//7AAAAAADP/4Cf/iAu//zP////9QL///9QAt//oK//cC///////8EAAAbv/+gnz/////62IAAD///9MAAAAAAAHf/1AABf///9////////9g" +
  "3//1AM/vcAAF///AAAAAAAf//B3/sADP////v///cAn//3AC3//BCP/6AH///////3AAGf///J7/////tiAAAAAG///+cAAAAAAJ//0QAAHf//" +
  "oZ////2//VAG//oACP/1AAA///wAAAAAAC7/+//2AAb///+D///1AB7/4APf/+MAX//QAH7/////9wAs/////////7cgAAAAAAAG////xiAAAD" +
  "n//3AAAAf/+gAFzuyCAzAAAGpgAAF5YAAADf75AAAAAAAJ////4gAAn//5AN//wQAv/+V+//4wAC7/9AACi+7//qEF7////////HMAAAAAAAAA" +
  "AF7////sqaz///0QAAAAemAAAAIgAAAAAAAAAAAAAAAAAATv4gAAAAAAA////7AAAAWpQABN+yAAT//////TAAAM//QAAAASIiEAX///////6U" +
  "AAAAAAAAAAAAACv//////////zAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANzAAAAAAAAC///9gAAAAAAAAASAAAC/////7IAAABf5wAAAAAAAA" +
  "AM//////xyAAAAAAAAAAAAAAAAfv///////+UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAT//+IAAAAAAAAAAAAAAJ////gAAAAA" +
  "AiAAAAAAAAAADP////tQAAAAAAAAAAAAAAAAAAGN/////+owAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAv/+AAAAAAAAAAAAAAA" +
  "AI/+owAAAAAAAAAAAAAAAAAAX//9gwAAAAAAAAAAAAAAAAAAAAAUeaqYUgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABemAAAA" +
  "AAAAAAAAAAAAACQgAAAAAAAAAAAAAAAAAAAASqUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

let mask: Float32Array | null = null;

function logoMask(): Float32Array {
  if (mask) return mask;
  const bytes = Uint8Array.from(atob(PACKED), (ch) => ch.charCodeAt(0));
  const m = new Float32Array(LW * LH);
  for (let k = 0; k < m.length; k++) {
    const b = bytes[k >> 1];
    m[k] = (k & 1 ? b & 15 : b >> 4) / 15;
  }
  mask = m;
  return m;
}

/** Opacidad del logo en (u, v), de 0 a 1, con interpolación bilineal. */
function sample(m: Float32Array, u: number, v: number): number {
  const x = u * LW - 0.5;
  const y = v * LH - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (xx: number, yy: number) => (xx < 0 || yy < 0 || xx >= LW || yy >= LH ? 0 : m[yy * LW + xx]);
  const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
  const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

export interface LogoPlacement {
  /** Esquina superior izquierda del logo, en píxeles del lienzo. */
  x: number;
  y: number;
  /** Ancho en píxeles; el alto sale de la proporción del logo. */
  width: number;
  /** Cuánto baja por cada píxel a la derecha: 0,5 en un frente isométrico, -0,5 en un costado. */
  slope?: number;
  color: Color;
  /** Opacidad máxima: el logo va en transparencia sobre la superficie. */
  opacity: number;
}

/** Estampa la firma sobre lo que ya está dibujado (no pinta sobre lo transparente). */
export function drawLogo(buf: PixelBuffer, p: LogoPlacement) {
  const m = logoMask();
  const slope = p.slope ?? 0;
  const h = (p.width * LH) / LW;
  const x0 = Math.floor(p.x);
  const x1 = Math.ceil(p.x + p.width);
  const y0 = Math.floor(p.y + Math.min(0, slope * p.width));
  const y1 = Math.ceil(p.y + h + Math.max(0, slope * p.width));
  // 4x4 muestras por píxel: la cobertura parcial queda como opacidad parcial.
  const S = 4;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let cover = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const dx = x + (sx + 0.5) / S - p.x;
          const dy = y + (sy + 0.5) / S - p.y - slope * dx;
          cover += sample(m, dx / p.width, dy / h);
        }
      }
      cover /= S * S;
      if (cover > 0.04) buf.blend(x, y, p.color, Math.min(1, cover * 1.25) * p.opacity);
    }
  }
}
