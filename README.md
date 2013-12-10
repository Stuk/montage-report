# montage-report

This hacked-together script generates a report of all the pull-requests and commits in the montagejs repos in the past week. It is used to help write The week in Montage blog posts each week

## Running

```bash
git clone git@github.com:Stuk/montage-report.git
npm install
node index.js
open report.html    # opens the report in the default browser
```

The script performs quite a large number of requests to the Github API, which can lead to rate-limiting errors. These can be prevented by authenticating with the API, by uncommenting the `github.authenticate` call in `index.js` and adding a username and password.

## License

2-Clause BSD
