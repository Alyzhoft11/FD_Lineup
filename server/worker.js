const { expose } = require("threads/worker");

expose(function lineUp(tempRoster) {
  let salary = 0;
  let pts = 0;
  let test2 = tempRoster;
  const flexPlayer = test2[7].id;
  if (
    flexPlayer != test2[1].id &&
    flexPlayer != test2[2].id &&
    flexPlayer != test2[3].id &&
    flexPlayer != test2[4].id &&
    flexPlayer != test2[5].id &&
    flexPlayer != test2[6].id
  ) {
    for (let z = 0; z < test2.length - 1; z++) {
      salary += test2[z].salary;
    }
    if (salary <= 60000) {
      for (let n = 0; n < test2.length - 1; n++) {
        pts += parseFloat(test2[n].points);
      }
      test2.push(pts);
    } else {
      test2 = null;
    }
  } else {
    test2 = null;
  }

  return test2;
});
