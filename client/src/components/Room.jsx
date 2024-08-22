import React, { useState, useEffect, useRef } from 'react';
import { useSocketContext } from '../content/socketContext';
import { usePeer } from '../content/PeerContext';
import { useParams } from 'react-router-dom';

function Room() {
    const userVideo = useRef();
    const screenRef = useRef();
    const { socket } = useSocketContext();
    const { userStream, otherUser, partnerVideo, callUser, handleRecieveCall, handleAnswer, handleNewICECandidateMsg, shareScreen, stopScreenShare } = usePeer();
    const { roomId, emailId } = useParams();
    const [mediaOptions, setMediaOptions] = useState({ mic: true, video: true, screen: false });
    const [isRemoteUser, setIsRemoteUser] = useState(false);
    // const [remoteUserMail,setRemoteUserMail] = useState("");

    useEffect(() => {
        const joinMeeting = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            userVideo.current.srcObject = stream;
            userStream.current = stream;

            socket.emit("join room", { roomId, emailId });

            socket.on('other user', ({ userId, emailId }) => {
                callUser(userId);
                otherUser.current = { userId, emailId };
                setIsRemoteUser(true);
            });

            socket.on("user joined", ({ userId, emailId }) => {
                otherUser.current = { userId, emailId };
                setIsRemoteUser(true);
            });

            socket.on("offer", handleRecieveCall);

            socket.on("answer", handleAnswer);

            socket.on("ice-candidate", handleNewICECandidateMsg);
        }

        joinMeeting();
    }, [socket, roomId, callUser, handleRecieveCall, handleAnswer, handleNewICECandidateMsg]);

    const toggleMediaOptions = async (option) => {
        let updatedOptions = {};

        if (option === "mic" && userStream.current) {
            const micEnabled = !mediaOptions.mic;
            userStream.current.getAudioTracks().forEach(track => {
                track.enabled = micEnabled;
            });
            updatedOptions.mic = micEnabled;
        }

        if (option === "video" && userStream.current) {
            const videoEnabled = !mediaOptions.video;
            userStream.current.getVideoTracks().forEach(track => {
                track.enabled = videoEnabled;
            });
            updatedOptions.video = videoEnabled;
        }

        if (option === "screen" && userStream.current) {
            if (!mediaOptions.screen) {
                const { screenTrack, stream } = await shareScreen();
                screenRef.current = screenTrack;
                userVideo.current.srcObject = stream;
                screenRef.current.onended = async function () {
                    await stopScreenShare();
                    userVideo.current.srcObject = userStream.current;
                    setMediaOptions(prev => ({ ...prev, screen: false }));
                };
                updatedOptions.screen = true;
            }
            else {
                screenRef.current.stop();
                stopScreenShare();
                userVideo.current.srcObject = userStream.current;
                updatedOptions.screen = false;
            }
        }

        setMediaOptions(prev => ({ ...prev, ...updatedOptions }));
    };

    return (
        <div>
            <div className="room">
                <div className='user'>
                    <video autoPlay ref={userVideo} className='video-container' muted />
                    <p>{emailId}</p>
                </div>
                {isRemoteUser &&
                    <div className='user'>
                        <video autoPlay ref={partnerVideo} className='video-container' />
                        <p>{otherUser.current.emailId}</p>
                    </div>}
            </div>

            <div className="meeting-options">
                {mediaOptions.mic ?
                    <i className="uil uil-microphone media-button" onClick={() => toggleMediaOptions("mic")}></i>
                    :
                    <i className="uil uil-microphone-slash media-button" onClick={() => toggleMediaOptions("mic")}></i>
                }
                {mediaOptions.video ?
                    <i className="uil uil-video media-button" onClick={() => toggleMediaOptions("video")}></i>
                    :
                    <i className="uil uil-video-slash media-button" onClick={() => toggleMediaOptions("video")}></i>
                }

                {mediaOptions.screen ?
                    <i className="uil uil-airplay media-button" onClick={() => toggleMediaOptions("screen")}></i>
                    :
                    <i className="uil uil-desktop-slash media-button" onClick={() => toggleMediaOptions("screen")}></i>
                }
            </div>
        </div>
    );
}

export default Room;
