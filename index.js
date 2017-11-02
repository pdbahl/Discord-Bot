const Discord = require('discord.js');
const client = new Discord.Client();
var mysql = require('mysql');

var con = mysql.createConnection({
    host: "localhost",
    user: "",
    password: "",
    database: "discord"
});

client.on('ready', () => {
    console.log('I am ready!');
    client.user.setGame("with some titties");
});

client.on('message', (message) => {
    const prefix = "!";

    const args = message.content.slice(prefix.length).trim().split(/ +/g); //parse arguments
    const command = args.shift().toLowerCase(); //set command to the right of "!"

    let bet, tokens, rank, member, isChangeable = false;
    let author = client.users.get(message.author.id); //get author object
    let server = message.guild;
    if (args.length > 0) {
        tokens = args[0]; //arg for givetokens
        if (message.mentions.members != null) {
            member = message.mentions.members.first();
            if (member != null) {
                if (message.guild.roles.exists("name", args[0]) && author.id != member.user.id) {
                    rank = message.guild.roles.find("name", args[0]).id;
                    isChangeable = true;
                }
            }
        }
    }
    //console.log(message.guild.roles.find("name",args[0]).id);
    addExp(author, server).then(function(result) {
        message.reply(result);
    });
    switch (command) {
        case "spin":
            var tokensWon;
            var random = Math.floor(Math.random() * 100);
            if (random < 55) {
                tokensWon = tokens;
            } else {
                tokensWon = -1 * tokens;
            }
            spin(author, tokens, tokensWon, server).then(function(result) {
                message.reply(result);
            });
            console.log(author.username + "#" + author['discriminator'] + " bet " + tokens + " tokens Result: " + tokensWon);
            break;
        case "givetokens":
            giveTokens(author, tokens, member, server).then(function(result) {
                message.reply(result);
            });
            break;
        case "rankup":

            if (isChangeable) {
                changeRank(rank, author, server).then(function(result) {
                    if (result == "pirates") {
                        console.log(rank);
                        member.addRole(rank).catch(console.error);
                    } else {
                        message.reply(result);
                    }
                });
            }
            break;
        case "derank":
            if (isChangeable) {
                changeRank(rank, author, server).then(function(result) {
                    if (result == "pirates") {
                        member.removeRole(rank).catch(console.error);
                    } else {
                        message.reply(result);
                    }
                });
            }
            break;
        case "adduser":
            toDB(member.user, server).then(function(result) {
                message.reply(result);
            });
            break;
        case "level":
            level(author, server).then(function(result) {
                message.reply(result);
            });
            break;
        case "help":
            message.author.send(help());
            break;
        case "addcom":

            //addCommand(author,args,server);
            break;
    }
});

const token = process.env.TOKEN;
client.login(token);

function spin(author, tokens, tokensWon, server) {

    return new Promise(function(resolve, reject) {
        var returne;
        if (tokens != null) {
            if (isInt(tokens)) {
                if (!(tokens < 1)) {
                    var check = "SELECT *,count(*) AS amount FROM discord_users WHERE author=? and server_id=?";
                    con.query(check, [author.id, server.id], function(err, rows, fields) {
                        if (err) console.log(err);
                        var nr = rows[0].amount;
                        if (nr < 1) {
                            resolve("You should use the !me command.");
                        } else if (nr >= 1) {
                            if (rows[0].tokens < tokens) {
                                resolve("You don't have enough tokens!");
                            } else {
                                var sql = "UPDATE discord_users SET tokens=? WHERE author='" + author.id + "' and server_id=" + server.id;
                                var newTokens = rows[0].tokens + parseInt(tokensWon);
                                con.query(sql, [newTokens], function(err, result) {
                                    if (err) throw err;
                                    var winlose;
                                    if (tokensWon < 0) {
                                        winlose = " and lost " + tokens;
                                    } else {
                                        winlose = " and won " + tokens;
                                    }
                                    resolve("You bet " + tokens + " tokens" + winlose + ". Your new total is " + newTokens);
                                });
                            }
                        }
                    });

                } else {
                    resolve("You must enter a positive number!");
                }
            } else {
                resolve("You must enter an integer!");
            }
        } else {
            resolve("You must enter a number!");
        }
    });
}

function giveTokens(author, tokens, member, server) {

    return new Promise(function(resolve, reject) {
        if (isInt(tokens)) {
            if (author.id != member.user.id) {
                var returner;
                var check = "SELECT * FROM discord_users WHERE author=? AND server_id=? UNION SELECT * FROM discord_users WHERE author=? AND server_id=?";
                con.query(check, [member.user.id, server.id, author.id, server.id], function(err, rows, fields) {
                    if (err) console.log(err);
                    var nr = rows.length;
                    if (nr < 2) {
                        resolve("You should use the !adduser command.");
                    } else {
                        if (rows[1].rank > 5) {
                            var sql = "UPDATE discord_users SET tokens=? WHERE author='" + member.user.id + "' AND server_id=" + server.id;
                            var newTokens = parseInt(rows[0].tokens) + parseInt(tokens);
                            con.query(sql, [newTokens], function(err, result) {
                                resolve(member.user.username + "#" + member.user.discriminator + " has been given " + tokens + " tokens. Their new token amount is " + newTokens)
                            });
                        } else {
                            resolve("You don't have high enough rank");
                        }
                    }
                });
            } else {
                resolve("You can't give yourself tokens!");
            }
        } else {
            resolve("Invalid Parameters");
        }
    });

}

function isInt(value) {
    return !isNaN(value) &&
        parseInt(Number(value)) == value &&
        !isNaN(parseInt(value, 10));
}

function changeRank(role, member, server) {
    return new Promise(function(resolve, reject) {
        var returner;
        var check = "SELECT *,count(*) AS amount FROM discord_users WHERE author=? AND server_id=?";
        con.query(check, [member.id, server.id], function(err, rows, fields) {
            if (err) console.log(err);
            var nr = rows[0].amount;
            if (nr < 1) {
                resolve("You should use the !me command.");
            } else {
                if (rows[0].rank > 5) {
                    resolve("pirates");
                } else {
                    resolve("You don't have high enough rank");
                }
            }
        });
    });
}

function toDB(member, server) {
    return new Promise(function(resolve, reject) {
        var check = "SELECT count(*) AS amount FROM discord_users WHERE author=? AND server_id=?";
        con.query(check, [member.id, server.id], function(err, rows, fields) {
            if (err) console.log(err);
            var nr = rows[0].amount;
            if (nr < 1) {
                var sql = "INSERT INTO discord_users (server_id,server_name,username,disc,author,tokens,rank,exp) VALUES ('" + server.id + "','" + server.name + "','" + member.username + "','" + member.discriminator + "'," + member.id + ",100,1,100)";
                con.query(sql, function(err, result) {
                    if (err) throw err;
                    console.log("1 record inserted");
                    returner = "Added to db.";
                    resolve(returner);
                });

            } else {
                resolve("They're already in there silly!");
            }
        });
    });
}

function expToLevel(exp) {
    return Math.floor(Math.pow(exp / 100, 1 / 1.1));
}

function randomTokens() {
    var random = Math.floor(Math.random() * 101);
    if (random == 100) {
        return 100 * 100;
    } else {
        return random;
    }
}

function level(author, server) {
    return new Promise(function(resolve, reject) {
        var check = "SELECT exp,count(*) AS amount FROM discord_users WHERE author=? AND server_id=?";
        con.query(check, [author.id, server.id], function(err, rows, fields) {
            resolve("Your level is " + expToLevel(rows[0].exp) + ".");
        });
    });
}

function addExp(author, server) {
    return new Promise(function(resolve, reject) {
        if (author.id != 368110844896346123) {
            var check = "SELECT *,count(*) AS amount FROM discord_users WHERE author=? AND server_id=?";
            con.query(check, [author.id, server.id], function(err, rows, fields) {
                if (err) console.log(err);
                var nr = rows[0].amount;
                if (nr > 0) {
                    var newExp = rows[0].exp + randomTokens();
                    var ran = randomTokens();
                    var newTokens = rows[0].tokens + ran;
                    if (ran == 10000) {
                        resolve("wow you got you just got " + ran + "tokens!!!!");
                    }
                    var sql = "UPDATE discord_users SET exp=?, tokens=? WHERE author=? AND server_id=?";
                    con.query(sql, [newExp, newTokens, author.id, server.id], function(err, result) {
                        if (Math.floor(Math.pow(newExp / 100, 1 / 1.1)) == (Math.sqrt(newExp / 100))) {
                            resolve("Congratulations, you just advanced a Chatting level. Your chatting level is now " + Math.floor(Math.pow(newExp / 100, 1 / 1.1)) + ". Also, your current exp is " + newExp + ".");
                        }
                    });
                } else {
                    toDB(author, server).then(function(result) {
                        resolve(result);
                    });
                }
            });
        }
    });
}

function help() {
    var returner = "Current Commands:\n\t !spin \n\t !level";
    console.log(returner);


    return returner;

}
