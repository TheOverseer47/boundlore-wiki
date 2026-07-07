# Discovery V1 Local QA Checklist

Use this checklist before any live rollout.

## Mode And Rollback

- Open `/wiki/create-post/?type=discovery`
- Confirm legacy fallback is active by default
- Confirm free-text discovery notes are available in fallback mode
- Open `/wiki/create-post/?type=discovery&enableStructuredDiscovery=1`
- Confirm structured discovery mode becomes active
- Re-open `/wiki/create-post/?type=discovery&enableStructuredDiscovery=0`
- Confirm immediate fallback to legacy mode

## Guide Safety

- Open `/wiki/create-post/`
- Confirm Guide flow still shows rich text editor
- Confirm Guide submission requirements are unchanged
- Open `/wiki/edit-post/?id=<guide-id>`
- Confirm Guide edit flow is unchanged

## Structured Discovery Input

- In structured mode, choose `Creatures`
- Confirm creature-specific fields appear
- Switch to `Items`
- Confirm item-specific fields replace creature fields
- Switch to `Locations`
- Confirm location-specific fields replace item fields

## Discovery Validation

- Try placeholder values like `test`, `asdf`, `unknown`
- Confirm submission is blocked
- Try repeated spam like `aaaaaa`
- Confirm submission is blocked
- Leave a required field empty
- Confirm submission is blocked
- Enter fewer than 4 meaningful words in required textarea fields
- Confirm submission is blocked
- Omit all relation links
- Confirm submission is blocked

## Duplicate Protection

- Create one discovery draft with a specific title/category/found-in combination
- Try to create a second very similar discovery in the same category
- Confirm duplicate warning blocks submission

## Upload Validation

- Upload a supported image file
- Confirm upload remains allowed
- In structured mode, map the upload to at least one structured fact
- Confirm submission is blocked if evidence exists but no evidence support field is selected
- Upload unsupported extension
- Confirm upload is blocked
- Upload too many files
- Confirm upload is blocked
- Upload a file above the size limit
- Confirm upload is blocked

## Admin Queue

- Open `/wiki/admin/?enableStructuredDiscovery=1`
- Confirm pending structured discoveries show `Ready` or `Needs fixes`
- Confirm blocked discoveries show issue list
- Confirm discoveries with attachments show evidence mapping count
- Confirm discoveries with attachments but missing evidence mapping are blocked
- Confirm `Approve Discovery` is disabled for invalid structured discoveries
- Confirm `Build Category Post` is disabled for invalid structured discoveries

## Final Post Rendering

- Open approved structured discovery post
- Confirm structured facts appear in `Discovery Data Network`
- Confirm linked dependencies are visible
- Confirm evidence mapping appears with supported structured fields and evidence links
- Confirm attachments still render in the post

## Legacy Compatibility

- Submit a discovery in fallback mode
- Confirm admin approval still works with structured mode disabled
- Confirm legacy discovery remains viewable in post detail
