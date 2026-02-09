export const parseRoundId = (id: string | number) => {
    const strId = String(id);
    if (strId.length >= 5) {
        const year = strId.substring(0, 4);
        const term = strId.substring(4);
        return { year, term };
    }
    return { year: strId, term: "" };
};

export const getTermLabel = (term: string | number) => {
    const t = String(term);
    if (t === "1") return "ภาคเรียนที่ 1";
    if (t === "2") return "ภาคเรียนที่ 2";
    if (t === "3") return "ภาคเรียนฤดูร้อน";
    return t ? `ภาคเรียนที่ ${t}` : "";
};

export const formatRoundId = (id: string | number) => {
    if (!id) return "ไม่ระบุรอบ";
    const { year, term } = parseRoundId(id);
    const termLabel = getTermLabel(term);
    return termLabel ? `ปีการศึกษา ${year} | ${termLabel}` : `ปีการศึกษา ${year}`;
};
