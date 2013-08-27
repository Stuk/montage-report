#!/usr/bin/env node

var FS = require("fs");
var Q = require("q");
var GitHubApi = require("github");
var Mustache = require("mustache");

var TEMPLATE = Mustache.compile(FS.readFileSync(__dirname + "/report.tmpl", "utf8"));

var LAST_WEEK = new Date();
LAST_WEEK.setDate(LAST_WEEK.getDate() - 7);


var github = new GitHubApi({
    version: "3.0.0"
});
// If you git the rate limit then uncomment and add your username and password
// github.authenticate({
//     type: "basic",
//     username: "username",
//     password: "password"
// });

console.log("Loading repos...");
Q.ninvoke(github.repos, "getFromUser", {user: "montagejs", per_page: 100})
.then(function (repos) {
    var repos = repos.filter(function (repo) {
        return new Date(repo.updated_at) > LAST_WEEK;
    }).sort(function (a, b) {
        return b.watchers - a.watchers;
    });

    console.log("Loading commits for", repos.length, "repos...");
    return Q.all(repos.map(function (repo) {
        return Q.ninvoke(github.repos, "getCommits", {
            user: "montagejs",
            repo: repo.name,
            since: LAST_WEEK
        });
    }))
    .then(function (reposCommits) {
        for (var i = 0; i < repos.length; i++) {
            repos[i].commits = reposCommits[i];
        }
        return repos;
    });
})
.then(function (repos) {
    console.log("Generating report...");
    var report = TEMPLATE({repos: repos});
    FS.writeFileSync("report.html", report);
})
.done();

