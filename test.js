// BellBot
// A bot that sends Stuyvesant's bell schedules to a channel
// Author: @ThunderRedStar

let Discord = require('discord.js');
let DJSBuilders = require('@discordjs/builders');
let { REST } = require("@discordjs/rest");
let { Routes } = require("discord-api-types/v9");
let Axios = require('axios');
let Chalk = require('chalk');
let DateTime = require('date-and-time');
let fs = require('fs');

const bellImgGen = require('./bellImgGen')
// Remember, this is Discord.js v14
let client = new Discord.Client({
	intents: new Discord.IntentsBitField(
		131071
	),
	partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

let BELL_SCHEDULE_API_BASE_URL = 'https://stuyutils-api.thundrredstar.repl.co/';
let BOT_ID = '970181059188781138';

// Slash command data
let startSlashCommand = new DJSBuilders.SlashCommandBuilder()
	.setName('start')
	.setDescription('Starts sending bell schedule embeds to the channel (every minute)')

let stopSlashCommand = new DJSBuilders.SlashCommandBuilder()
	.setName('stop')
	.setDescription('Stops sending bell schedule embeds to the channel')

// On ready
client.on('ready', async () => {
	console.log(Chalk.green('Logged in as ' + client.user.tag));
	client.user.setActivity('with the bells', {
		type: 'PLAYING'
	});
	// Attempt to deploy the slash commands
	let rest = new REST({
		version: '10'
	}).setToken(process.env.TOKEN);
	let slashCommandBody = new Array()
	slashCommandBody.push(startSlashCommand.toJSON());
	slashCommandBody.push(stopSlashCommand.toJSON());
	await rest.put(Routes.applicationCommands(BOT_ID), {
		body: slashCommandBody
	});
	console.log(Chalk.green('Slash commands deployed'));
	// Every minute,
	setInterval(async () => {
		// GET request the day info from the API, using today's date in YYYY-MM-DD format
		let dayInfo = await Axios.get(BELL_SCHEDULE_API_BASE_URL + 'get_day_info?day=' + DateTime.format(new Date(), 'YYYY-MM-DD'));
		// Get the day info's data
		dayInfo = dayInfo.data;
		let bellsToday = dayInfo.school
		// GET request the current class info from the API, using today's date in YYYY-MM-DD HH:MM:SS format
		let currentClassInfo = await Axios.get(BELL_SCHEDULE_API_BASE_URL + 'get_current_class?day=' + DateTime.format(new Date(), 'YYYY-MM-DD HH:mm:ss'));
		// Get the current class info's data
		// If there was an error, log it and end the program
		if (currentClassInfo.data.error) {
			console.log(Chalk.red(currentClassInfo.data.error));
			process.exit(1);
		}
		currentClassInfo = currentClassInfo.data;
		// Split the start time and end time into an array
		let startTime = currentClassInfo.start.split(':');
		let endTime = currentClassInfo.end.split(':');
		let thisPeriodName = currentClassInfo.period;
		// Convert the hours, minutes, and seconds into a date, with the year, month, and day being today's date
		startTime = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), startTime[0], startTime[1], startTime[2]);
		endTime = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), endTime[0], endTime[1], endTime[2]);
		// Get the current time
		let currentTime = new Date();
		// Calculate the time since the start of the class in minutes, and the time until the end of the class in minutes
		let timeSinceStart = Math.floor((currentTime - startTime) / 60000);
		let timeUntilEnd = Math.floor((endTime - currentTime) / 60000);
		// Get the next class info from the API, using today's date in YYYY-MM-DD HH:MM:SS format
		let nextClassInfo = await Axios.get(BELL_SCHEDULE_API_BASE_URL + 'get_next_class?day=' + DateTime.format(new Date(), 'YYYY-MM-DD HH:mm:ss') + '');
		// If there was an error, log it and end the program
		if (nextClassInfo.data.error) {
			console.log(Chalk.red(nextClassInfo.data.error));
			process.exit(1);
		}
		// Get the next class info's data
		// If the data is an empty object, there are no more classes today
		let nextPeriodName;
		if (Object.keys(nextClassInfo.data).length === 0) {
			nextPeriodName = 'N/A';
		} else {
			nextPeriodName = nextClassInfo.data.period;
		}
		// Read the file storing all channels receiving the bell schedule
		let channelInfo = fs.readFileSync('db.json', 'utf8');
		// Parse the file
		channelInfo = JSON.parse(channelInfo);
		const attachment = new Discord.Attachment(bellImgGen(thisPeriodName, timeSinceStart, timeUntilEnd, nextPeriodName), 'bells.png');
		// Build an embed with all the information
		let embed = new DJSBuilders.Embed()
			.setTitle('Bells')
			.setDescription("**" + (dayInfo.schedule !== null ? dayInfo.schedule : 'N/A') + '** bell schedule')
			.addField({
				name: 'Cycle',
				value: (dayInfo.cycle !== null ? dayInfo.cycle : 'N/A'),
				inline: true
			})
			.addField({
				name: 'Testing',
				value: (dayInfo.testing !== null ? dayInfo.testing : 'N/A'),
				inline: true
			})
			.addField({
				name: 'Events',
				value: (dayInfo.events !== null ? dayInfo.events : 'N/A'),
				inline: true
			})
			.setImage('attachment://bells.png')
			.setColor(8068104)
			.setFooter({
				text: 'Last updated ' + DateTime.format(new Date(), 'MMMM DD, YYYY h:mm:ss A')
			});
		if (bellsToday === false) {
			embed = new DJSBuilders.Embed()
				.setTitle('Bells')
				.setDescription('No school today, go back to sleep!')
				.setColor(8068104)
				.setFooter({
					text: 'Last updated ' + DateTime.format(new Date(), 'MMMM DD, YYYY h:mm:ss A')
				});
		}
		// For each channel,
		for (let i = 0; i < channelInfo.length; i++) {
			// Find the old message in the channel
			let channel;
			if (channelInfo[i].channelId) {
				channel = await client.channels.fetch(channelInfo[i].channelId);
			}
			if (channel) {
				// Try to delete other messages in the channel
				try {
					let messages = await channel.messages.fetch({ limit: 100 });
					await channel.bulkDelete(messages);
					// Post the new message
					let msgToSend = {
						embeds: [embed],
					}
					if (bellsToday === true) {
						msgToSend.files = [attachment];
					}
					await channel.send(msgToSend);
				} catch (e) {
					console.log(Chalk.red(e));
				}
			}
		}
		// Log success
		console.log(Chalk.green('Successfully updated bell embeds'));
	}, 30000);
});

// On interaction
client.on('interactionCreate', async (interaction) => {
	// Check if the interaction is a command, otherwise return
	if (!interaction.isCommand()) return;
	// Get the command
	let command = interaction.commandName;
	if (command == "start") {
		// Load the database
		let db = fs.readFileSync('db.json', 'utf8');
		// Parse the database
		db = JSON.parse(db);

		// Get the channel
		// If the channel is already there, reply saying it's already there
		let channel = interaction.channel.id;
		let channelExists = false;
		for (let i = 0; i < db.length; i++) {
			if (db[i].channelId == channel) {
				channelExists = true;
			}
		}

		if (channelExists) {
			interaction.reply('This channel is already receiving the bell schedule.');
		} else {
			// Otherwise, add the channel to the database
			db.push({
				channelId: channel,
				messageId: null
			});
			// Save the database
			fs.writeFileSync('db.json', JSON.stringify(db));
			// Reply saying it's added
			interaction.reply('This channel is now receiving the bell schedule. You should hopefully see the bell schedule within a minute.');
		}
	} else if (command == "stop") {
		// Load the database
		let db = fs.readFileSync('db.json', 'utf8');
		// Parse the database
		db = JSON.parse(db);

		// Get the channel
		// If the channel isn't there, reply saying it isn't there
		let channel = interaction.channel.id;
		let channelExists = false;
		for (let i = 0; i < db.length; i++) {
			if (db[i].channelId == channel) {
				channelExists = true;
			}
		}

		if (!channelExists) {
			interaction.reply('This channel is not receiving the bell schedule.');
		} else {
			// Otherwise, remove the channel from the database
			for (let i = 0; i < db.length; i++) {
				if (db[i].channelId == channel) {
					db.splice(i, 1);
				}
			}
			// Save the database
			fs.writeFileSync('db.json', JSON.stringify(db));
			// Reply saying it's removed
			interaction.reply('This channel is no longer receiving the bell schedule.');
		}
	}
});

// Token is in process.env.TOKEN
client.login(process.env.TOKEN);