export const credentials = { username: 'synthetic.user', password: 'a&b=+%#?<> space' };
export const loginHTML = '<html><form id="loginForm"><input name="password" type="password"></form></html>';
export const courseHTML = (mark = 85, href = 'viewReport.php?subject_id=123&student_id=456') => `<html><div class="green_border_message"><div><table>
  <tr><td>Course Name</td><td>Block</td><td>Start</td><td>End</td><td>Grade</td></tr>
  <tr><td><a href="${href.replaceAll('&', '&amp;')}">MHF4U-01 : Advanced Functions</a></td><td>Block: P1 rm. 306</td><td>2026-09-08</td><td>2027-01-29</td><td>current mark = ${mark}%</td></tr>
  </table></div></div></html>`;
export const reportHTML = `<html><table cellpadding="5">
  <tr bgcolor="#ffffaa"><td>Knowledge</td><td>50%</td><td>50%</td><td>80%</td></tr>
  <tr bgcolor="#c0fea4"><td>Thinking</td><td>50%</td><td>50%</td><td>90%</td></tr>
  </table><table width="100%">
  <tr><td rowspan="2">Functions test</td><td bgcolor="ffffaa">16 / 20 = 80% weight=2</td><td bgcolor="c0fea4">9 / 10 = 90% weight=1</td></tr><tr><td>Feedback omitted</td></tr>
  <tr><td rowspan="2">Pending task</td><td bgcolor="ffffaa">not finished weight=1</td></tr><tr><td></td></tr>
  </table></html>`;
export function mockSchool() {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    const path = new URL(url).pathname;
    return new Response(path.endsWith('viewReport.php') ? reportHTML : options.method === 'POST' ? courseHTML() : loginHTML,
      { headers: { 'content-type': 'text/html; charset=utf-8', 'set-cookie': 'PHPSESSID=synthetic-session; Secure; HttpOnly; Path=/live/' } });
  };
  return { requests, fetchImpl };
}
