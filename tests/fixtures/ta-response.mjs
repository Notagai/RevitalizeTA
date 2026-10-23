/** Invented API-shaped data. No student or school account was used. */
export function taResponse() {
  return { response: [
    { code: 'MHF4U-01', name: 'Advanced Functions', block: '1', room: '306',
      teacher: 'Ms. Example', start_time: '2026-09-08', end_time: '2027-01-29',
      overall_mark: 85, isFinal: false, isMidterm: false,
      weight_table: { KU: { W: 50, CW: 50, SA: 80 }, T: { W: 50, CW: 50, SA: 90 } },
      assignments: [
        { name: 'Functions test', date: '2026-10-20', KU: [{ get: 16, total: 20, weight: 2, finished: true }], T: [{ get: 9, total: 10, weight: 1, finished: true }] },
        { name: 'Pending task', KU: [{ get: 0, total: 0, weight: 1, finished: false }] },
      ] },
    { code: 'ENG4U-02', name: 'English', block: '2', room: 'N/A',
      start_time: '2027-02-01', end_time: '2027-06-30', overall_mark: 'N/A', isFinal: false, isMidterm: false,
      assignments: [], weight_table: {} },
  ] };
}
