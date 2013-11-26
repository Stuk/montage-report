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
    // Filter to get ones with activity in the past week
    repos = repos.filter(function (repo) {
        return new Date(repo.updated_at) > LAST_WEEK;
    });

    console.log("Loading commits and PRs for", repos.length, "repos...");
    return Q.all(repos.map(function (repo) {
        return Q.all([
            Q.ninvoke(github.repos, "getCommits", {
                user: "montagejs",
                repo: repo.name,
                since: LAST_WEEK
            }),
            Q.ninvoke(github.pullRequests, "getAll", {
                user: "montagejs",
                repo: repo.name,
                state: "closed",
                per_page: 100
            })
            .then(function (pulls) {
                return pulls.filter(function (pull) {
                    return pull.merged_at && new Date(pull.merged_at) > LAST_WEEK;
                });
            })
        ]);
    }))
    .then(function (reposCommitsPulls) {
        console.log("Filtering commits in pull requests...");
        for (var i = 0; i < repos.length; i++) {
            var commits = reposCommitsPulls[i][0];
            var pulls = reposCommitsPulls[i][1];

            pulls.forEach(function (pull) {
                markCommitsInPull(commits, pull);
            });

            repos[i].commits = commits.filter(function (commit) {
                return !commit.pullRequest && commit.commit.message.search(/^Merge pull request/) === -1;
            });
            repos[i].pulls = reposCommitsPulls[i][1];
        }
        // Sort in decending order of the number of pulls
        return repos.sort(function (a, b) {
            return b.pulls.length - a.pulls.length;
        });
    });
})
.then(function (repos) {
    console.log("Generating report...");
    var report = TEMPLATE({repos: repos});
    FS.writeFileSync("report.html", report);
})
.done();

function markCommitsInPull(commits, pull) {
    var parentSha = pull.head.sha;
    var baseSha = pull.base.sha;

    var shaIndexMap = {};
    commits.forEach(function (commit, index) {
        shaIndexMap[commit.sha] = index;
    });

    pull.commits = [];

    while(shaIndexMap[parentSha] && parentSha !== baseSha) {
        var commit = commits[shaIndexMap[parentSha]];
        commit.pullRequest = pull;
        pull.commits.push(commit);
        if (commit.parents.length > 1) {
            break;
        }
        parentSha = commit.parents[0].sha;
    }
    return commits;
}
