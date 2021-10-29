# Haraka plugin for Google Pub/Sub

This Haraka plugin forwards mail data to Google Pub/Sub.

## Setup

- Install Google Pub/Sub in the root directory of your Haraka installation folder.
```
npm i @google-cloud/pubsub
```
- Create the configuration file `gpubsub_queue.json` in the `config` directory. It will include the topic name and path to your [service account key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys).
```
{
  topic: 'pubsub-topic',
  keyFilename: '/path/to/key.json'
}
```
- Copy the `gpubsub_queue.js` file to the `plugins` directory
- Add `gpubsub_queue` to your list of plugins (Add to `/config/plugins` file)

## Data

The data sent is in the format:

```
{
  header: {
    to: [],
    from: '',
    date: '',
    message_id: '',
    subject: '',
  },
  body: 'Content of body'
}
```

The following additional header properties may be included if they exist:

- `bcc`
- `cc`
- `sender`
- `in_reply_to`
- `reply_to`
- `references`
- `auto_submitted`

## Todo

- Support for Attachment