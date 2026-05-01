# Wiki sources

These markdown files are the source of truth for the project's GitHub wiki at
<https://github.com/Jan-Ka/foundryvtt-opend6-space/wiki>.

GitHub wikis live in their own git repository (`<repo>.wiki.git`) which is not
a submodule of this repo. To publish updates:

```bash
git clone https://github.com/Jan-Ka/foundryvtt-opend6-space.wiki.git /tmp/od6s.wiki
cp wiki/*.md /tmp/od6s.wiki/
cd /tmp/od6s.wiki
git add -A
git commit -m "Sync wiki from main repo"
git push
```

Page filenames map to wiki URLs by replacing dashes with spaces — e.g.
`System-Settings.md` becomes the page at `/wiki/System-Settings`.
