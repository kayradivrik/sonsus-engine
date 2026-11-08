import { RefObject } from "react";

/**
 * Donanım ivmeli yerel GPU kaydırmasını engellemeden yüksek tazeleme hızlarında
 * (144Hz / 180Hz) sıfır gecikmeli kaydırma sağlar.
 */
export function useSmoothWheel(_containerRef: RefObject<HTMLElement | null>, _enabled = true) {
  // WebKitGTK üzerinde wheel engellemesi (passive: false) kaldırıldı;
  // yerel GPU compositor akışı doğrudan çalışır.
}
