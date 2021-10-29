const { PubSub } = require('@google-cloud/pubsub')
// const fs = require('fs')

exports.register = function () {
  this.loginfo('Initializing Google Cloud Pub/Sub queue')

  const config = this.config.get('gpubsub_queue.json')
  this.topic = config.topic
  this.keyFilename = config.keyFilename

  this.pubSubClient = new PubSub({
    keyFilename: this.keyFilename
  })
}

// Enable mail body parsing
exports.hook_data = function (next, connection) {
  connection.transaction.parse_body = true
  next()
}

/*
// Enable mail body parsing
exports.hook_data = function (next, connection) {
  connection.transaction.parse_body = true
  connection.transaction.attachment_hooks(
    function (ct, fn, body, stream) {
      startAtt(connection, ct, fn, body, stream)
    }
  )
  next()
}

function startAtt (connection, ct, fn, body, stream) {
  // connection.loginfo("Got attachment: " + ct + ", " + fn + " for user id: " + connection.transaction.notes.hubdoc_user.email);
  // connection.transaction.notes.attachment_count++;
  stream.connection = connection
  stream.pause()

  const tmp = require('tmp')
  tmp.file(function (err, path, fd) {
    if (err) {
      return
    }
    // connection.loginfo("Got tempfile: " + path + " (" + fd + ")")
    const ws = fs.createWriteStream(path)
    stream.pipe(ws)
    stream.resume()
    ws.on('close', function () {
      // connection.loginfo("End of stream reached")
      fs.fstat(fd, function (err, stats) {
        if (err) {
          return
        }
        // connection.loginfo("Got data of length: " + stats.size);
        // Close the tmp file descriptor
        fs.close(fd, () => {})
      })
    })
  })
}
*/

// Queue hook. Handle email
exports.hook_queue = async function (next, connection) {
  this.loginfo('Google Cloud Pub/Sub queue called')

  try {
    const header = connection.transaction.header.headers.headers_decoded ? connection.transaction.header.headers.headers_decoded : connection.transaction.header.headers
    const headers = {
      from: header.from[0],
      date: header.date[0],
      message_id: header['message-id'][0],
      subject: header.subject[0],
      to: header.to
    }
    // todo:
    // reply id
    // Automatic response
    if (header.cc) {
      headers.cc = header.cc
    }
    if (header.bcc) {
      headers.bcc = header.bcc
    }
    if (header.sender) {
      headers.sender = header.sender
    }
    if (header['in-reply-to']) {
      headers.in_reply_to = header['in-reply-to']
    }
    if (header.references) {
      headers.references = header.references
    }
    if (header['reply-to']) {
      headers.reply_to = header['reply-to']
    }
    if (header['auto-submitted'] && header['auto-submitted'] !== 'no') {
      headers.auto_submitted = header['auto-submitted']
    }
    const children = connection.transaction.body.children
    let body = null
    for (const child of children) {
      if (child.is_html) {
        body = child.bodytext
        break
      }
    }
    if (!body) {
      for (const child of children) {
        if (child.bodytext) {
          body = child.bodytext
          break
        }
      }
    }

    if (!body) {
      if (connection.transaction.body.bodytext) {
        body = connection.transaction.body.bodytext
      } else {
        // next(DENY)
        this.logerror('No body')
        // const ws = fs.createWriteStream('/var/log/mail-log')
        // ws.write(JSON.stringify(connection.transaction.body))
        // ws.end()
        next(OK)
        return
      }
    }

    const dataBuffer = Buffer.from(JSON.stringify({
      channel: 'email',
      headers,
      body
    }))
    const messageId = await this.pubSubClient.topic(this.topic).publishMessage({
      data: dataBuffer
    })
    this.loginfo(`Message ${messageId} published.`)
  } catch (error) {
    this.logerror(error.message)
  }

  next(OK)
}
