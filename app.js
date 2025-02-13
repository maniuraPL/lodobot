
/* lodobot - a random bot for shits and giggles
 * 2021 - Daniel Mania
 * TODO: start using good coding practices
 */

require('dotenv').config()
const Discord = require('discord.js');

const botInts = new Discord.Intents();
botInts.add(
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_VOICE_STATES,
    Discord.Intents.FLAGS.GUILDS
)
const client = new Discord.Client({ intents: botInts });

const schedule = require('node-schedule');
//var SpotifyWebApi = require('spotify-web-api-node');
const fs = require('fs');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const { joinVoiceChannel, createAudioPlayer, NoSubscriberBehavior, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');

const basics = require('./functions/basics.js')

/* var spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTI_CL_ID,
    clientSecret: process.env.SPOTI_CL_SCR,
    redirectUri: 'http://www.example.com/callback'
}); */

// spotify integration tests, may come in handy later, for now unused

/* spotifyApi.clientCredentialsGrant().then(
    function (data) {
        //console.log('The access token expires in ' + data.body['expires_in']);
        //console.log('The access token is ' + data.body['access_token']);

        // Save the access token so that it's used in future calls
        spotifyApi.setAccessToken(data.body['access_token']);

        spotifyApi.getPlaylist('37i9dQZF1DXd1MXcE8WTXq')
            .then(function (data) {
                console.log('Some information about this playlist', data.body.tracks.items);
            }, function (err) {
                console.log('Something went wrong!', err);
            }); 
    },
    function (err) {
        console.log('Something went wrong when retrieving an access token', err);
    }
);

async function spoti_test() {
    const creds = await spotifyApi.clientCredentialsGrant()
    await spotifyApi.setAccessToken(creds.body['access_token'])
    const playlist = await spotifyApi.getPlaylist('37i9dQZF1DXd1MXcE8WTXq')
    console.log(playlist.body.tracks.items)
} */

// some internal info for the bot to use, TODO: clean that stuff up

let is_playing = false
let queue = new Array()
let conn = null
let vc = null
let player = null
let subscription = null
let stop = false


const prefix = './';
const botColor = 0xcf58d1

let jump_number = 0

// config placeholder, no better idea, but gets the job done for now, TODO: come up with a better way to store the config

let config = {
    papaj: false,
    krzykacz: false,
    autoplay: true
}


function sendToLog(user, mess) { // simple logging function 
    const date = new Date()
    console.log('[' + date.toLocaleString("pl-PL") + '] ' + '[' + user + ']' + ': ' + mess)
}

// music player related helper functions

async function get_next(msg,curr_info) {
    if (config.autoplay && curr_info && !queue.length) {
        new_link = 'https://youtube.com' + curr_info.response.contents.twoColumnWatchNextResults.autoplay.autoplay.sets[0].autoplayVideo.commandMetadata.webCommandMetadata.url
        sendToLog('autoplay_test', new_link)
        new_info = await get_info(new_link)
    }
    else {
        new_info = queue[0]
    }
    send_title(msg, new_info.videoDetails.title)
    return new_info
}

function send_title(msg,title) {
    const embed = {
        color: botColor,
        fields: [
            {
                name: 'Odtwarzanie:',
                value: title
            }
        ]
    }
    msg.channel.send({ embeds: [embed] })
    sendToLog(msg.member.user.tag, 'Odtwarzanie: ' + title)
}

async function get_info(link) {
    //sendToLog('get_info_link',link)
    let info = await ytdl.getInfo(link)
    ytdl.chooseFormat(info.formats, { quality: 'highestaudio' })
    return info
}

function play_file(msg) {
    curr_info = queue[0]
    send_title(msg,curr_info.videoDetails.title)
    if (!player) {
        sendToLog('play_file', 'audio player created')
        player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
    }
    player.play(createAudioResource(ytdl.downloadFromInfo(curr_info)))
    sendToLog('play_file', 'player started')
    if (!subscription) {
        sendToLog('play_file', 'audio player subscribed')
        subscription = conn.subscribe(player)
    }
    is_playing = true
    player.on(AudioPlayerStatus.Idle, async () => {
        sendToLog('play_file', 'audio player finished')
        queue.shift()
        if (queue[0] || config.autoplay && !stop) {
            sendToLog('play_file', 'next track')
            new_info = await get_next(msg, curr_info)
            curr_info = new_info
            player.play(createAudioResource(ytdl.downloadFromInfo(curr_info)))
            stop = false
        }
        else {
            sendToLog('play_file', 'end of queue')
            is_playing = false
            stop = false
        }
    })
    player.on('error', error => {
        sendToLog('play_file', 'audio player error: '+error)
    })

}

async function play_audio(msg, path) { //function to play audio, finally, based on previous code
    const vc = msg.member.voice.channel
    if (is_playing) {
        sendToLog('play_audio', 'already playing')
        return
    }
    if (!vc) {
        const embed = {
            color: botColor,
            fields: [
                {
                    name: 'Błąd',
                    value: 'Musisz być na kanale głosowym!'
                }
            ]
        }
        msg.channel.send({ embeds: [embed] })
        return
    }
    try {
        is_playing = true
        if (!conn) {
            sendToLog('play_audio', 'no conn, making')
            conn = await joinVoiceChannel({
                channelId: vc.id,
                guildId: msg.guild.id,
                adapterCreator: msg.guild.voiceAdapterCreator
            })
        }
        audio_player.play(createAudioResource(path))
        sendToLog('play_audio', 'player started')
        subscription = await conn.subscribe(audio_player)
        sendToLog('play_audio', 'audio player subscribed')
        audio_player.on(AudioPlayerStatus.Idle, () => {
            sendToLog('play_audio', 'audio player finished')
            is_playing = false

            //audio_conn.destroy()
        })
    }
    catch (err) {
        sendToLog(msg.member.user.tag, err)
    }
}

client.on('ready', () => {
    sendToLog(client.user.tag, 'Dołączono')
    client.user.setActivity(
        'wpisz "' + prefix + 'help"', {
        type: "LISTENING"
    }
    );
    const papaj_job = schedule.scheduleJob('* 37 21 * * *', async function () {  // plays barka everyday at 21:37
        if (config.papaj == true) {
            if (!is_playing) {
                const all_voice = client.guilds.cache.get('804799693581975594').channels.cache.get('804802536551743569').children
                //console.log(all_voice)
                const with_users = all_voice.find(function (channel) {
                    //console.log(channel.members.array())
                    return channel.members.array().length > 0
                })
                //console.log(with_users)
                if (with_users) {
                    sendToLog(client.user.tag, 'Bareczka leci')
                    if (!conn) {
                        conn = await joinVoiceChannel({
                            channelId: vc.id,
                            guildId: msg.guild.id,
                            adapterCreator: msg.guild.voiceAdapterCreator
                        })
                    }
                    player.play(createAudioResource('./audio/barka.mp3'))
                    conn.subscribe(player)
                    is_playing = true
                    player.on(AudioPlayerStatus.Idle, () => {
                        is_playing = false
                        conn.destroy()
                    })
                }
                else {
                    sendToLog(client.user.tag, 'Nikogo nie ma na papieżową')
                    is_playing = false
                }
            }
        }
    })

    const jump_job = schedule.scheduleJob('*/5 * * * * *', function () { // reset number of jumps between channels every 5 secs, TODO: place it somewhere where it belongs
        jump_number = 0
    })
});

client.on('messageCreate', async msg => {
    // do nothing if the message is from the bot or it doesn't use the set prefix

    if (msg.author.bot) return;
    if (msg.content.includes("@here") || msg.content.includes("@everyone")) return false;
    if (msg.mentions.has(client.user)) {
        msg.channel.send('Wpisz ' + prefix + 'help żeby zobaczyć listę komend!')
    }
    if (!msg.content.startsWith(prefix)) return;

    /* parse the message into a separate object containing the command and it's parameters
      * eg. ./config something on is parsed into:
      * message.command = config
      * params[0] = something
      * params[1] = on
      * it's a surprise tool that will help us later
      * */

    const split = msg.content.substring(prefix.length).split(' ')
    const command = split.shift()
    const params = split


    const message = {
        command: command,
        params: params
    }

    sendToLog(msg.member.user.tag, 'wysłano ' + JSON.stringify(message))



    if (message.command === 'help') { // help message with a list of commands, TODO: somehow make it translatable
        /* const messageEmbed = {
            color: botColor,
            title: 'lodobot v21.3.7',
            description: 'Dostępne komendy:',
            fields: [
                {
                    name: prefix + 'loda?',
                    value: 'spytaj się bota czy to pora na loda ekipy'
                },
                {
                    name: prefix + 'nie wiem',
                    value: 'ty no nie wiem'
                },
                {
                    name: prefix + 'drzwi',
                    value: 'po chuj napierdalasz w te drzwi psychopatko jebana'
                },
                {
                    name: prefix + 'p link do youtube/termin wyszukiwania',
                    value: 'odtwarza coś lub dodaje do kolejki'
                },
                {
                    name: prefix + 'q',
                    value: 'wyświetla kolejkę utworów'
                },
                {
                    name: prefix + 'skip',
                    value: 'przeskakuje do następnego utworu w kolejce'
                }
            ]
        }
        msg.channel.send({ embed: messageEmbed }) */
        basics.help(msg, botColor, prefix, 'msg')
    }
    if (message.command === 'nie_wiem') {
        await play_audio(msg, './audio/ty-no-nie-wiem.mp3') //using new function
    }

    if (message.command === 'loda?') {
        msg.reply('a pytasz dzika czy sra w lesie? zawsze jest pora na looooooda')
    }

    if (message.command === 'drzwi') {
        await play_audio(msg, './audio/drzwi.mp3')
    }
    if (message.command === 'shee') {
        await play_audio(msg, './audio/shee.wav')
    }

    if (message.command === 'play' || message.command === 'p') { // youtube music player, currently very broken and freezes the bot often, TODO: fix this
        vc = msg.member.voice.channel
        if (!vc) {
            const embed = {
                color: botColor,
                fields: [
                    {
                        name: 'Błąd',
                        value: 'Musisz być na kanale głosowym!'
                    }
                ]
            }
            msg.channel.send({ embeds: [embed] })
            return
        }

        let link = null
        //sendToLog('song', message.params.join(' '))
        if (message.params[0].startsWith('https://youtube.com/watch?v=') || message.params[0].startsWith('https://www.youtube.com/watch?v=')) {
            link = message.params[0]
        }
        else {
            const results = await yts(message.params.join(' '))
            link = results.all[0].url
        }
        const info = await get_info(link)
        if (queue.length && !config.autoplay) {
            const embed = {
                color: botColor,
                fields: [
                    {
                        name: 'Dodano do kolejki:',
                        value: info.videoDetails.title
                    }
                ]
            }
            msg.channel.send({ embeds: [embed] })
        }
        queue.push(info)
        if (!is_playing) {
            if (!conn) {
                conn = await joinVoiceChannel({
                    channelId: vc.id,
                    guildId: msg.guild.id,
                    adapterCreator: msg.guild.voiceAdapterCreator
                })
            }
            play_file(msg)
        }

    }
    if (message.command === 'stop') {
        queue = []
        sendToLog('stop', 'queue cleaned')
        stop = true
        player.stop()
        sendToLog('stop', 'player stop done')
        player = null
    }
    if (message.command === 'leave') {
        subscription.unsubscribe()
        subscription = null
        sendToLog('leave', 'audio player unsubscribed')
        conn.destroy()
        conn = null
        sendToLog('leave', 'bot left')
    }
    if (message.command === 'skip' || message.command === 's') {
        vc = msg.member.voice.channel
        if (!vc) {
            const embed = {
                color: botColor,
                fields: [
                    {
                        name: 'Błąd',
                        value: 'Musisz być na kanale głosowym!'
                    }
                ]
            }
            msg.channel.send({ embeds: [embed] })
            return
        }
        if (!queue) {
            const embed = {
                color: botColor,
                fields: [
                    {
                        name: 'Błąd',
                        value: 'Kolejka jest pusta!'
                    }
                ]
            }
            msg.channel.send({ embeds: [embed] })
            return
        }
        player.stop()
    }
    if (message.command === 'queue' || message.command === 'q') {
        vc = msg.member.voice.channel
        if (!vc) {
            const embed = {
                color: botColor,
                fields: [
                    {
                        name: 'Błąd',
                        value: 'Musisz być na kanale głosowym!'
                    }
                ]
            }
            msg.channel.send({ embeds: [embed] })
            return
        }
        if (!queue.length) {
            const embed = {
                color: botColor,
                fields: [
                    {
                        name: 'Błąd',
                        value: 'Kolejka jest pusta!'
                    }
                ]
            }
            msg.channel.send({ embeds: [embed] })
            return
        }
        const embed = {
            color: botColor,
            fields: [
                {
                    name: 'Kolejka: ',
                    value: 'Kolejka odtwarzania'
                }
            ]
        }
        queue.forEach(function (song, i) {
            embed.fields.push({
                name: i + '. ' + song.videoDetails.title,
                value: 'x'
            })
        })
        msg.channel.send({ embeds: [embed] })
    }

    /* if (message.command === 'game') { // idea for making a game lobby automatically, TODO: get working on this 
        let button = new MessageButton()
            .setLabel("Zagraj!")
            .setStyle('blurple')
            .setID('play_button')
        await msg.channel.send(`${msg.author.username} chce zagrać! Kolejka: \n${msg.author.username}`, button);
    } */

    /* client.on('clickButton', async (button) => {
    await button.message.edit('Ktoś mie kliknął uwu')
}); */

    //discord-buttons now outdated, probably a part of discord.js, hopefully

    if (message.command === 'config') { // config management, not very pretty but works well
        if (!msg.member.roles.cache.some(role => role.id === '866777290330341427')) { // checking for the "jebani programiści" role so that everyone can't change the settings
            msg.channel.send('oj nie nie byniu tobie nie wolno tego używać')
            return
        }
        if (message.params[0] === 'papaj') {
            if (message.params[1] === 'on') {
                msg.channel.send('papaj on')
                config.papaj = true
            }
            else if (message.params[1] === 'off') {
                msg.channel.send('papaj off')
                config.papaj = false
            }
            else if (!message.params[1]) {
                if (config.papaj == true) msg.channel.send('status papaja: on')
                else msg.channel.send('status papaja: off')
            }
            else {
                msg.channel.send('nie kumam szefie')
            }
        }
        else if (message.params[0] === 'krzykacz') {
            if (message.params[1] === 'on') {
                msg.channel.send('krzykacz on')
                config.krzykacz = true
            }
            else if (message.params[1] === 'off') {
                msg.channel.send('krzykacz off')
                config.krzykacz = false
            }
            else if (!message.params[1]) {
                if (config.krzykacz == true) msg.channel.send('status krzykacza: on')
                else msg.channel.send('status krzykacza: off')
            }
            else {
                msg.channel.send('nie kumam szefie')
            }
        }
        else {
            msg.channel.send('sorry szefie, nie znam takiej opcji')
        }
    }
});


client.on('voiceStateUpdate', (memberBeforeJoin, memberAfterJoin) => { // screams a message on a channel if people are moving around channels waaaay too fast
    if (config.krzykacz == true) {
        // don't scream if a user is jumping around the ping-pong channels on our server, it's a looong story
        if (memberAfterJoin.channelID != '848546786032615436' || memberAfterJoin.channelID != '848546824498315274' || memberAfterJoin.channelID != '849004787188891659' || memberAfterJoin.channelID != '848546799186214962') {
            jump_number++
        }
        if (jump_number > 5) { // more than 5 jumps in 5 seconds
            client.channels.cache.get('804802612171767828').send(`PRZESTAŃCIE SIĘ KURWA PRZERZUCAĆ`)
        }
    }
})

client.login(process.env.DSC_TOKEN);
