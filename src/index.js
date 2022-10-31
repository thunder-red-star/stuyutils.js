const fs = require('fs');
const path = require('path');
require('csv-parser');
const errors = require('./errors');
const DateTime = require('date-and-time');

// Structural stuff
Info = function(school, cycle, schedule, testing, events) {
	let self = {};
	self.school = school;
	self.cycle = cycle;
	self.schedule = schedule;
	self.testing = testing;
	self.events = events;
	return self;
}

Time = function(start, end) {
	let self = {};
	self.start = start;
	self.end = end;
	return self;
}

// Parse Term Days as TSV, return object of Info objects
let termDaysFile = fs.readFileSync(path.join(__dirname, './data/term-days-2023.tsv'), 'utf8');
let termDays = {};

// Parse TSV
termDaysFile.split('\n').forEach(function(line) {
	let [date, school, cycle, schedule, testing, events] = line.split('\t');
	termDays[date] = Info(
		school === "True",
		cycle === "None" ? null : cycle,
		schedule === "None" ? null : schedule,
		testing === "None" ? null : testing,
		events === "None" ? null : events
	);
});


function timeToTimestamp (date) {
	if (date instanceof Date) {
		return date.getTime();
	} else {
		return DateTime.parse(date, 'H:mm A').getTime();
	}
}

// Parse all bell schedules as TSV, return object of Time objects
let regularBellsFile = fs.readFileSync(path.join(__dirname, "./data/regular.tsv"), "utf8");
let conferenceBellsFile = fs.readFileSync(path.join(__dirname, "./data/conference.tsv"), "utf8");
let homeroomBellsFile = fs.readFileSync(path.join(__dirname, "./data/homeroom.tsv"), "utf8");
let ptcBellsFile = fs.readFileSync(path.join(__dirname, "./data/ptc.tsv"), "utf8");
let extendedHomeroomBellsFile = fs.readFileSync(path.join(__dirname, "./data/extended-homeroom.tsv"), "utf8");

let regularBells = {};
let conferenceBells = {};
let homeroomBells = {};
let ptcBells = {};
let extendedHomeroomBells = {};

let regularBellsFileLines = regularBellsFile.split('\n');
regularBellsFileLines.shift();
regularBellsFileLines.forEach(function(line) {
	let cols = line.split('\t');
	regularBells[cols[0]] = Time(DateTime.parse(cols[1], "h:mm A", true), DateTime.parse(cols[2].trim(), "h:mm A", true));
});

let conferenceBellsFileLines = conferenceBellsFile.split('\n');
conferenceBellsFileLines.shift();
conferenceBellsFileLines.forEach(function(line) {
	let cols = line.split('\t');
	conferenceBells[cols[0]] = Time(DateTime.parse(cols[1], "h:mm A", true), DateTime.parse(cols[2].trim(), "h:mm A", true));
});

let homeroomBellsFileLines = homeroomBellsFile.split('\n');
homeroomBellsFileLines.shift();
homeroomBellsFileLines.forEach(function(line) {
	let cols = line.split('\t');
	homeroomBells[cols[0]] = Time(DateTime.parse(cols[1], "h:mm A", true), DateTime.parse(cols[2].trim(), "h:mm A", true));
});

let ptcBellsFileLines = ptcBellsFile.split('\n');
ptcBellsFileLines.shift();
ptcBellsFileLines.forEach(function(line) {
	let cols = line.split('\t');
	ptcBells[cols[0]] = Time(DateTime.parse(cols[1], "h:mm A", true), DateTime.parse(cols[2].trim(), "h:mm A", true));
});

let extendedHomeroomBellsFileLines = extendedHomeroomBellsFile.split('\n');
extendedHomeroomBellsFileLines.shift();
extendedHomeroomBellsFileLines.forEach(function(line) {
	let cols = line.split('\t');
	extendedHomeroomBells[cols[0]] = Time(DateTime.parse(cols[1], "h:mm A", true), DateTime.parse(cols[2].trim(), "h:mm A", true));
});

function getDayInfo (date) {
	/**
	 * Returns the info for a given date
	 * @param date: Date
	 * @returns Info
	 */
	let dayInfo = termDays[DateTime.format(date, "YYYY-MM-DD")];

	if (dayInfo === undefined) {
		// Error with DayNotInData
		throw new errors.DayNotInData(DateTime.format(date, "YYYY-MM-DD"));
	}
	return dayInfo;
}

function getNextSchoolDay (date) {
	/**
	 * Returns the next school day after the given date
	 * @param date: Date | string
	 * @returns Date
	 */
	let day;
	if (date instanceof String) {
		day = DateTime.parse(date, "YYYY-MM-DD HH:mm:ss");
	} else {
		day = date;
	}
	let dayInfo = getDayInfo(day);
	if (dayInfo === undefined) {
		// Error with DayNotInData
		throw new errors.DayNotInData(DateTime.format(day, "YYYY-MM-DD"));
	}
	let nextDay = DateTime.addDays(day, 1);
	while (getDayInfo(nextDay).school === false) {
		if (getDayInfo(nextDay) === undefined) {
			return undefined;
		}
		nextDay = DateTime.addDays(nextDay, 1);
	}
	return nextDay;
}

function getBellSchedule (date, thisDay = false) {
	/**
	 * Returns the bell schedule for a given date
	 * @param date: Date | string
	 * @returns [key: string]: Time
	 */
	let day;
	if (date instanceof String) {
		day = DateTime.parse(date, "YYYY-MM-DD HH:mm:ss");
	} else {
		day = date;
	}
	let dayInfo = getDayInfo(day);
	if (dayInfo === undefined) {
		// Error with DayNotInData
		throw new errors.DayNotInData(DateTime.format(day, "YYYY-MM-DD"));
	}
	let bellSchedule = {};
	if (dayInfo.schedule != null && dayInfo.school === true) {
		if (dayInfo.schedule === "Regular") {
			bellSchedule = regularBells;
		} else if (dayInfo.schedule === "Conference") {
			bellSchedule = conferenceBells;
		} else if (dayInfo.schedule === "Homeroom") {
			bellSchedule = homeroomBells;
		} else if (dayInfo.schedule === "PTC") {
			bellSchedule = ptcBells;
		} else if (dayInfo.schedule === "Extended Homeroom") {
			bellSchedule = extendedHomeroomBells;
		}
	} else {
		// If thisDay is true, and there was no schedule found in the above if statements, return undefined
		// Otherwise find the next school day and return the bell schedule for that day
		if (thisDay) {
			bellSchedule = undefined;
		} else {
			bellSchedule = getBellSchedule(getNextSchoolDay(day));
		}
	}
	return bellSchedule;
}

function getCurrentClass (date) {
	/**
	 * Returns the current class for a given date
	 * @param date: Date | string
	 * @returns Time
	 */
	let day;
	if (date instanceof String) {
		day = DateTime.parse(date, "YYYY-MM-DD HH:mm:ss");
	} else {
		day = date;
	}
	let dayInfo = getDayInfo(day);
	if (dayInfo === undefined) {
		// Error with DayNotInData
		throw new errors.DayNotInData(DateTime.format(day, "YYYY-MM-DD"));
	}
	let bellSchedule = getBellSchedule(day);
	if (bellSchedule === undefined) {
		return undefined;
	}
	for (let period in bellSchedule) {
		let bellTime = bellSchedule[period];
		let timeEpoch = DateTime.parse(DateTime.format(day, "HH:mm:ss", ), "HH:mm:ss", true);
		if (timeEpoch.getTime() >= bellTime.start.getTime() && timeEpoch.getTime() <= bellTime.end.getTime()) {
			return new Object({
				period: period,
				start: bellTime.start,
				end: bellTime.end
			});
		}
	}
	return undefined;
}

function getNextClass (date, skipPassing = false) {
	/**
	 * Returns the next class for a given date
	 * @param date: Date | string
	 * @returns Time
	 */
	let day;
	if (date instanceof String) {
		day = DateTime.parse(date, "YYYY-MM-DD HH:mm:ss");
	} else {
		day = date;
	}
	let dayInfo = getDayInfo(day);
	if (dayInfo === undefined) {
		// Error with DayNotInData
		throw new errors.DayNotInData(DateTime.format(day, "YYYY-MM-DD"));
	}
	let bellSchedule = getBellSchedule(day);
	if (bellSchedule === undefined) {
		return undefined;
	}
	let nextClass = undefined;
	// Get current class
	let currentClass = getCurrentClass(day);
	// Find next class
	for (let x = 0; x < Object.keys(bellSchedule).length; x++) {
		let period = Object.keys(bellSchedule)[x];
		let bellTime = bellSchedule[period];
		if (currentClass === undefined) {
			if (bellTime.start.getTime() >= day.getTime()) {
				if (!(skipPassing === true && Object.keys(bellSchedule)[x].includes("Passing"))) {
					nextClass = new Object({
						period: period,
						start: bellTime.start,
						end: bellTime.end
					});
					break;
				}
			}
		} else {
			if (bellTime.start.getTime() >= currentClass.end.getTime()) {
				if (!(skipPassing === true && Object.keys(bellSchedule)[x].includes("Passing"))) {
					nextClass = new Object({
						period: period,
						start: bellTime.start,
						end: bellTime.end
					});
					break;
				}
			}
		}
	}
	return nextClass;
}

// Like getNextClass, but returns just the period name
function getCurrentPeriod (date) {
	/**
	 * Returns the current period name for a given date
	 * @param date: Date | string
	 * @returns string
	 */
	let day;
	if (date instanceof String) {
		day = DateTime.parse(date, "YYYY-MM-DD HH:mm:ss");
	} else {
		day = date;
	}
	let dayInfo = getDayInfo(day);
	if (dayInfo === undefined) {
		// Error with DayNotInData
		throw new errors.DayNotInData(DateTime.format(day, "YYYY-MM-DD"));
	}
	let bellSchedule = getBellSchedule(day);
	if (bellSchedule === undefined) {
		return undefined;
	}
	let currentPeriod = undefined;
	for (let period in bellSchedule) {
		let bellTime = bellSchedule[period];
		if (timeToTimestamp(day) >= timeToTimestamp(bellTime.start) && timeToTimestamp(day) <= timeToTimestamp(bellTime.end)) {
			currentPeriod = period;
		}
	}
	return currentPeriod;
}

module.exports = {
	getDayInfo: getDayInfo,
	getNextSchoolDay: getNextSchoolDay,
	getBellSchedule: getBellSchedule,
	getCurrentClass: getCurrentClass,
	getNextClass: getNextClass,
	getCurrentPeriod: getCurrentPeriod
}