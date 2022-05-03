const StuyUtils = require('../src/index.js');

let timeNow = new Date(2022, 4, 3, 12, 0, 0);

console.log("It is now " + timeNow);

console.log("========");

let todayData = StuyUtils.getDayInfo(timeNow);
console.log("Do we have school? " + (todayData.school == true ? "Yes" : "No"));
console.log("Cycle: " + todayData.cycle);
console.log("Schedule: " + todayData.schedule);
console.log("Testing: " + todayData.testing);
console.log("Events: " + todayData.events);

let todayBells = StuyUtils.getBellSchedule(timeNow);
console.log("Bells: " + JSON.stringify(todayBells, null, 2));

let currentClass = StuyUtils.getCurrentClass(timeNow);
console.log("Current class: " + currentClass.period);
console.log("Period started: " + currentClass.start.toTimeString({ timeZone: 'America/New York' }));
console.log("Period ends: " + currentClass.end.toTimeString());

let nextClass = StuyUtils.getNextClass(timeNow);
let nextClassSkipPassing = StuyUtils.getNextClass(timeNow, true);
if (nextClass) {
  console.log("Next class: " + nextClass.period);
  console.log("Next class starts: " + nextClass.start.toTimeString());
  console.log("Next class ends: " + nextClass.end.toTimeString());
} else {
  console.log("No next class");
}

if (nextClassSkipPassing) {
  console.log("Next class (skip passing): " + nextClassSkipPassing.period);
  console.log("Next class starts: " + nextClassSkipPassing.start.toTimeString());
  console.log("Next class ends: " + nextClassSkipPassing.end.toTimeString());
} else {
  console.log("No next class (skip passing)");
}

console.log("");

// Testing a bell schedule check when there isn't school, for example, May 2nd, 2022
let timeNowNoSchool = new Date(2022, 4, 2, 12, 0, 0);
console.log("It is now " + timeNowNoSchool);
console.log(timeNowNoSchool instanceof Date);
let todayDataNoSchool = StuyUtils.getDayInfo(timeNowNoSchool);
let todayBellsNoSchool = StuyUtils.getBellSchedule(timeNowNoSchool);
let todayBellsNoSchoolToday = StuyUtils.getBellSchedule(timeNowNoSchool, true);

console.log("It is now " + timeNowNoSchool);
console.log("Testing next school day's bells (should contain at least 1 key): " + Object.keys(todayBellsNoSchool).length + " keys");
console.log("Testing today's bells (should be undefined or have no keys): " + Object.keys(todayBellsNoSchoolToday || {}).length + " keys");

console.log("========");