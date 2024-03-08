import express, { Request, Response } from "express";
import fs from "fs";
import { Server } from "socket.io";
import https from "https";
import cors from "cors";

const app = express();

app.use(cors());

app.use(function (req, res, next) {
	// Website you wish to allow to connect
	res.header("Access-Control-Allow-Origin", "*");

	// Request methods you wish to allow
	res.header(
		"Access-Control-Allow-Methods",
		"GET, POST, OPTIONS, PUT, PATCH, DELETE"
	);

	// Request headers you wish to allow
	res.header("Access-Control-Allow-Headers", "X-Requested-With,content-type");

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader("Access-Control-Allow-Credentials", "false");

	// Pass to next layer of middleware
	next();
});

app.use(express.static(__dirname));

const PORT = 4000;

//we need a key and cert to run https
//we generated them with mkcert
// $ mkcert create-ca
// $ mkcert create-cert
const key = fs.readFileSync("cert.key");
const cert = fs.readFileSync("cert.crt");

//we changed our express setup so we can use https
//pass the key and cert to createServer on https
// const expressServer = https.createServer({ key, cert }, app);
const expressServer = https.createServer({ key, cert }, app);

//create our socket.io server... it will listen to our express port

const io = new Server(expressServer, {
	cors: {
		origin: ["https://v-conf-app.netlify.app"],
		allowedHeaders: ["*"],
		methods: ["GET", "POST"],
	},
	transports: ["polling", "websocket"],
});

expressServer.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

type Message = {
    id: number;
    user: string;
    text: string;
}
type TUsers = {
    [key in string]: {
        peerId: string;
        userId: string
    }[]
}
const users: TUsers = {};
const messages: Message[] = [];
const socketToRoom: any = {};

io.on("connection", (socket) => {
	socket.on("join room", (payload) => {
		const { roomID, peerId } = payload;

		console.log(roomID, socket.id);

		if (users[roomID]) {
			const length = users[roomID].length;
			if (length === 10) {
				socket.emit("room full");
				return;
			}
			users[roomID].push({
				peerId,
				userId: socket.id,
			});
            
		} else {
			users[roomID] = [
				{
					peerId,
					userId: socket.id,
				},
			];
		}

		socketToRoom[socket.id] = roomID;

        // emit to all existing/online users
		socket.broadcast.emit("all users", users[roomID]);

        // emit to self
		socket.emit("all users", users[roomID]);

		console.log({ users });
	});

	// Send initial messages to the connected client
	socket.emit("initialMessages", messages);

	// Listen for new messages from clients
	socket.on("sendMessage", (data) => {
		const newMessage = {
			id: messages.length + 1,
			user: data.user,
			text: data.text,
		};
		messages.push(newMessage);

		// Broadcast the new message to all connected clients
        socket.emit("newMessage", newMessage);
		socket.broadcast.emit("newMessage", newMessage);
	});

	socket.on("disconnect", () => {
		const roomID = socketToRoom[socket.id];
		let room = users[roomID];
		if (room) {
			room = room.filter((id: any) => id.userId !== socket.id);
			users[roomID] = room;
			console.log({ newUsers: users });
		}
	});
});

app.get("/", (req: Request, res: Response) => {
    res.send('Hello from Video Conference Demo App'); 
})