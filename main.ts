import * as net from 'net';
import * as dgram from 'dgram';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: +(process.argv[2] ?? 30000), host: process.argv[3] ?? "127.0.0.1" }, () => {
  console.log(`Listening on ws://${wss.options.host}:${wss.options.port}`)
});

const key = process.env.KEY ?? ""

wss.on('connection', function connection(ws, req) {
  const params = new URLSearchParams(req.url?.split('?').slice(1).join('?'));

  ws.binaryType = 'arraybuffer';

  if (params.get('key') !== key) {
    ws.close(1008, "Invalid key");
  } else {
    const protocol = params.get('protocol') ?? 'tcp';
    const port = +(params.get('port') ?? NaN)
    const host = params.get('host');

    if (!host) {
      ws.close(1008, "Invalid host");
      return;
    }

    console.log(`Connecting ${req.socket.remoteAddress} to ${protocol}://${host}:${port}`)

    if (protocol === 'tcp') {
      let socket = net.createConnection({
        port,
        host,
      })
      ws.on('message', function message(data) {
        socket.write(data as any);
      });

      ws.on('close', () => {
        socket.end();
      });

      socket.on('data', (data) => {
        ws.send(data)
      })

      socket.on('close', () => {
        ws.close();
      })

      socket.on('error', (err) => {
        ws.close(1008, err.message);
      })

    } else if (protocol === 'udp') {
      let socket = dgram.createSocket('udp4');
      socket.connect(port, host);

      ws.on('message', function message(data) {
        socket.send(data as any);
      });

      ws.on('close', () => {
        socket.close()
      });

      socket.on('message', (data) => {
        ws.send(data);
      })

      socket.on('close', () => {
        ws.close();
      })

    }

    ws.on('error', console.error);
  }
});

