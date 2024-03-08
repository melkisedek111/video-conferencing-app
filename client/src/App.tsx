import { useEffect, useRef, useState } from 'react'
import './App.css'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import ChatBox from './components/ChatBox'
import { io, Socket } from 'socket.io-client';
import Peer, { MediaConnection } from 'peerjs'

type TUsers = {
    peerId: string;
    userId: string
};

const RemoteVideo = (props: any) => {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        props.call.on("stream", (stream: any) => {
            if (ref.current) {
                ref.current.srcObject = stream;
            }
        })
    }, []);

    return <video ref={ref} className="bg-gray-200 w-[320px] rounded-2xl" autoPlay playsInline></video>
}

type TRemoteStream = { call: MediaConnection };

function generateRandomCodeName() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randomLetters = '';

    // Generate 4 random letters
    for (let i = 0; i < 4; i++) {
        randomLetters += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // Generate 3 random digits
    const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    // Combine letters and digits with a dash
    return `${randomLetters}-${randomDigits}`;
}

function App() {
    const roomID = "x100";
    const userVideo = useRef<HTMLVideoElement | null>(null);
    const [username, setUsername] = useState<string>("");
    const [peer, setPeer] = useState<Peer | undefined>(undefined);
    const [devices, setDevices] = useState<{ label: string; value: string }[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>("");
    const [peerId, setPeerId] = useState<string | undefined>(undefined);
    const [remoteStreams, setRemoteStreams] = useState<TRemoteStream[]>([]);
    const [socketIo, setSocketIo] = useState<Socket | null>(null)

    useEffect(() => {
        if (!socketIo) {
            // initialize socket io client
            const url = import.meta.env.VITE_PRODUCTION_API || "https://localhost:8181"
            const socket = io(url);
            setSocketIo(socket);
        }
        if (!username) {
            // set client code name
            setUsername(generateRandomCodeName());
        }
    }, [])

    useEffect(() => {
        async function getUserMedia() {

            if (username) {
                // initialize local stream
                let stream: MediaStream | undefined = undefined;

                // check for multiple cameras
                if (devices.length) {
                    if (selectedDevice) {
                        stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: selectedDevice }, audio: true });
                    }
                } else {
                    // select only the existed camera
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                }

                if (stream) {
                    // assign local stream
                    if (userVideo.current) {
                        userVideo.current.srcObject = stream;
                    }

                    // check for initialized socket and peer connection
                    if (socketIo && peer) {

                        // set call on mount
                        peer.on("call", call => {
                            call.answer(stream);
                        })

                        // emit room id, peer id and username the moment the page load
                        socketIo.emit("join room", { roomID, peerId: peer.id, username });

                        // get all the users online
                        socketIo.on("all users", (users: TUsers[]) => {

                            // filter only the other users not the self
                            const newUsers = users.filter((item: TUsers) => item.userId !== socketIo.id);
                            const peerStream: TRemoteStream[] = [];

                            // push all the call existing per peer id, peer id is the key to connect to the existing call
                            for (const user of newUsers) {
                                const call = peer.call(user.peerId, stream);
                                peerStream.push({ call });
                            }

                            setRemoteStreams(peerStream);
                        })

                    }
                }
            }
        }
        getUserMedia();

    }, [selectedDevice]);

    const handleCameraChange = (value: string) => {
        setSelectedDevice(value);
    }

    useEffect(() => {
        // get all the existing device camera
        navigator.mediaDevices.enumerateDevices().then(dev => {
            const videoDevices = dev.filter(device => device.kind === 'videoinput');
            const newDevices = videoDevices.map(device => ({ label: device.label, value: device.deviceId })).filter(device => device.label !== "");
            setDevices(newDevices);
        });

        if (!peer) {
            // initialize peer connection (default values)
            const newPeer = new Peer({
                host: "0.peerjs.com",
                port: 443,
                path: "/",
                pingInterval: 5000,
            });

            async function getPeerId() {
                // important to have the peer id before connecting to the socket io
                const setNewPeerId = async (): Promise<string> => {
                    return new Promise(resolve => {
                        newPeer.on("open", id => {
                            resolve(id);
                        });
                    });
                }

                // set the peer id
                if (!peerId) {
                    const newPeerId = await setNewPeerId();
                    setPeerId(newPeerId);
                }
                setPeer(newPeer);
            }
            getPeerId();
        }
    }, [])

    return (
        <div>
            <div className="h-svh flex justify-center gap-20 mt-10">
                <div className="w-[1000px]">
                    <Select onValueChange={handleCameraChange} defaultValue={selectedDevice}>
                        <SelectTrigger className="mb-5 w-[500px] mx-auto" disabled={devices.length === 1}>
                            <SelectValue placeholder={`${devices.length ? "Select Camera" : "There's 1 device has been detected"}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {devices && devices.map((dev) => (
                                <SelectItem key={dev.value} value={dev.value}>
                                    {dev.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <video ref={userVideo} className="bg-gray-200 w-[700px] rounded-2xl mx-auto" autoPlay playsInline></video>
                    <div className="flex flex-wrap mt-5 gap-5">
                        {
                            remoteStreams.map((item: TRemoteStream, index: number) => (
                                <RemoteVideo key={index} call={item.call} />
                            ))
                        }
                    </div>
                </div>
                <ChatBox socketIo={socketIo} username={username} />
            </div>
        </div>
    )
}

export default App
