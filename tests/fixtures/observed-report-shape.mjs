/**
 * Reconstructed from the 2026-10-24 sanitized emulator export.
 * The five-table DOM structure is grounded in the observed report.
 * Every course, assessment, score, mark, and identifier below is invented.
 * Never store an unredacted school response in this repository.
 */
export const observedShapeReport = '<html>' +
  '<table width="60%" cellpadding="3" cellspacing="0" border="1">' +
    '<tr><td colspan="2">Example course summary</td></tr>' +
    '<tr><td bgcolor="#ffffff"></td><td>Sample summary</td></tr>' +
    '<tr><td bgcolor="#ffffff"></td><td>Please see teacher for current status</td></tr>' +
  '</table>' +
  '<table width="100%" cellpadding="3" cellspacing="0" border="1">' +
    '<tr><th>Assessment</th><td bgcolor="#ffffaa">Knowledge</td><td bgcolor="#c0fea4">Thinking</td>' +
      '<td bgcolor="#afafff">Communication</td><td bgcolor="#ffd490">Application</td>' +
      '<td bgcolor="#cccccc">Final</td><td bgcolor="#ffffff">Feedback</td></tr>' +
    '<tr><td rowspan="2">Example Quiz</td>' +
      '<td bgcolor="#ffffaa" id="synthetic-ku-1">8 / 10 = 80% weight=1</td>' +
      '<td bgcolor="#c0fea4" id="synthetic-t-1">9 / 10 = 90% weight=1</td>' +
      '<td bgcolor="#afafff" id="synthetic-c-1">7 / 10 = 70% weight=1</td>' +
      '<td bgcolor="#ffd490" id="synthetic-a-1">10 / 10 = 100% weight=1</td>' +
      '<td bgcolor="#cccccc"></td><td bgcolor="#ffffff"></td></tr>' +
    '<tr><td colspan="6"></td></tr>' +
    '<tr><td rowspan="2">Example Assignment</td>' +
      '<td bgcolor="#ffffaa" id="synthetic-ku-2">4 / 5 = 80% weight=1</td>' +
      '<td bgcolor="#c0fea4" id="synthetic-t-2">8 / 10 = 80% weight=1</td>' +
      '<td bgcolor="#afafff" id="synthetic-c-2">not finished weight=1</td>' +
      '<td bgcolor="#ffd490" id="synthetic-a-2">4 / 5 = 80% weight=1</td>' +
      '<td bgcolor="#cccccc"></td><td bgcolor="#ffffff"></td></tr>' +
    '<tr><td colspan="6"></td></tr>' +
  '</table>' +
  '<table width="90%">' +
    '<tr><th colspan="1">Example breakdown</th></tr>' +
    '<tr><th>Category</th><th>Published weighting</th><th>Achievement</th></tr>' +
    '<tr bgcolor="#ffffaa"><td>Knowledge</td><td></td><td></td></tr>' +
    '<tr bgcolor="#c0fea4"><td>Thinking</td><td></td><td></td></tr>' +
    '<tr bgcolor="#afafff"><td>Communication</td><td></td><td></td></tr>' +
    '<tr bgcolor="#ffd490"><td>Application</td><td></td><td></td></tr>' +
    '<tr bgcolor="#cccccc"><td>Final</td><td></td><td></td></tr>' +
    '<tr bgcolor="#ffffff"><td>Summary</td><td></td><td></td></tr>' +
    '<tr><td style="text-align:center"></td></tr>' +
  '</table>' +
  '<table width="50%" cellpadding="10" cellspacing="0" border="0">' +
    '<tr bgcolor="#ffffff"><td>80%</td><td>Example</td></tr>' +
    '<tr bgcolor="#ffffff"><td colspan="2">Footer</td></tr>' +
  '</table>' +
  '<table cellpadding="5" border="0"><tr><td></td></tr></table>' +
  '</html>';
