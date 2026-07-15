(function(global){
  "use strict";

  function parseFlexibleAmount(value){
    if(typeof value === "number") return Number.isFinite(value) ? value : NaN;

    const raw = String(value ?? "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[₺TL]/gi, "");

    if(!/^\d+(?:[.,]\d+)*$/.test(raw)) return NaN;

    const dots = (raw.match(/\./g) || []).length;
    const commas = (raw.match(/,/g) || []).length;

    if(dots && commas){
      const decimalMark = raw.lastIndexOf(".") > raw.lastIndexOf(",") ? "." : ",";
      const groupingMark = decimalMark === "." ? /,/g : /\./g;
      return +raw.replace(groupingMark, "").replace(decimalMark, ".");
    }

    const mark = dots ? "." : commas ? "," : "";
    if(!mark) return +raw;

    const parts = raw.split(mark);
    if(parts.length > 2){
      const grouped = parts.slice(1).every(part => part.length === 3);
      return grouped ? +parts.join("") : +`${parts.slice(0, -1).join("")}.${parts.at(-1)}`;
    }

    const [whole, fraction] = parts;
    return fraction.length === 3 && whole.length <= 3
      ? +(whole + fraction)
      : +`${whole}.${fraction}`;
  }

  global.parseFlexibleAmount = parseFlexibleAmount;
})(typeof window === "undefined" ? globalThis : window);
