import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers'; // Keep this for consistency
import axios from 'axios';
import FormData from 'form-data';
import Ethers from './utils/Ethers';
import FeedRegistryABI from './assets/FeedRegistryABI.json';
import './App.css';

const API_BASE_URL = 'http://localhost:5000';
const AKAVE_API_BASE_URL = 'http://localhost:8000';
const NETWORK_ID = "0x4cb2f"; // Filecoin Calibration Testnet

function App() {
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState(null);
    const [feeds, setFeeds] = useState([]);
    const [account, setAccount] = useState('');
    const [contract, setContract] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [loading, setLoading] = useState(false);
    const [networkError, setNetworkError] = useState('');

    const shortenAddress = (address) => `${address.slice(0, 5)}...${address.slice(-4)}`;

    const initializeEthers = async () => {
        const ethersInstance = Ethers();
        if (!ethersInstance) {
            console.log("Ethers initialization failed. MetaMask might not be installed.");
            return;
        }

        const { provider, signer, contract } = ethersInstance;
        setProvider(provider);
        setSigner(signer);
        setContract(contract);

        try {
            const address = await signer.getAddress();
            setAccount(address);
            await checkNetwork(provider);
        } catch (error) {
            console.error("Failed to get address:", error);
        }
    };

    const connectWallet = async () => {
        if (!window.ethereum) {
            alert("MetaMask is not installed!");
            return;
        }

        try {
            await window.ethereum.request({ method: "eth_requestAccounts" });
            await initializeEthers();
            console.log("Wallet connected:", account);
        } catch (error) {
            console.error("Failed to connect wallet:", error.message);
            alert("Failed to connect wallet: " + error.message);
        }
    };

    const checkNetwork = async (provider) => {
        if (!provider) {
            console.log("No provider available.");
            return;
        }

        try {
            const network = await provider.getNetwork();
            console.log("Current Network Chain ID:", network.chainId);
            if (network.chainId !== parseInt(NETWORK_ID, 16)) {
                setNetworkError("Please switch to the Filecoin Calibration Testnet.");
            } else {
                setNetworkError("");
            }
        } catch (error) {
            console.error("Error checking network:", error);
            alert("Error checking network: " + error.message);
        }
    };

    const switchNetwork = async () => {
        if (!window.ethereum) {
            alert("MetaMask is not installed!");
            return;
        }

        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: NETWORK_ID }],
            });
            setNetworkError("");
            console.log("Switched to Filecoin Calibration Testnet.");
        } catch (switchError) {
            if (switchError.code === 4902) {
                await addNetwork();
            } else {
                console.error("Error switching network:", switchError);
                alert("Error switching network: " + switchError.message);
            }
        }
    };

    const addNetwork = async () => {
        if (!window.ethereum) {
            alert("MetaMask is not installed!");
            return;
        }

        try {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: NETWORK_ID,
                    chainName: "Filecoin Calibration Testnet",
                    rpcUrls: ["https://api.calibration.node.glif.io/rpc/v1"],
                    nativeCurrency: { name: "Filecoin", symbol: "tFIL", decimals: 18 },
                    blockExplorerUrls: ["https://calibration.filscan.io"],
                }],
            });
            console.log("Filecoin Calibration Testnet added.");
        } catch (addError) {
            console.error("Error adding network:", addError);
            alert("Error adding network: " + addError.message);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) setImage(file);
    };

    const akaveApiRequest = async (method, endpoint, data = null, isFormData = false, description = null) => {
        try {
            const config = { method, url: `${AKAVE_API_BASE_URL}${endpoint}` };
            if (isFormData) {
                config.data = data;
                config.headers = data.getHeaders();
            } else if (data) {
                config.data = data;
                config.headers = { 'Content-Type': 'application/json' };
            }
            if (description) {
                data.append('description', description);
            }
            const response = await axios(config);
            return response.data;
        } catch (error) {
            throw new Error(error.response ? error.response.data.error : error.message);
        }
    };

    // const uploadToAkave = async (content) => {
    //     while (new TextEncoder().encode(content).length < 127) content += ' ';
    //     const bucketName = `feed-${account.slice(0, 8)}`;
    //     try {
    //         await akaveApiRequest('POST', '/buckets', { bucketName });
    //     } catch (error) {
    //         if (!error.message.includes('already exists')) throw error;
    //     }
    //     const form = new FormData();
    //     const fileName = `feed-${Date.now()}.txt`;
    //     form.append('file', new Blob([content], { type: 'text/plain' }), fileName);
    //     const uploadResponse = await akaveApiRequest('POST', `/buckets/${bucketName}/files`, form, true);
    //     return uploadResponse.cid;
    // };

    const uploadToAkave = async (image, description) => {
        // Ensure image data is in a format that can be uploaded (e.g., base64 encoded)
        const imageBlob = new Blob([image], { type: 'image/jpeg' });
        const imageFile = new File([imageBlob], 'image.jpg', { type: 'image/jpeg' });
    
        // Create a new bucket if it doesn't exist
        const bucketName = `feed-${account.slice(0, 8)}`;
        try {
            await akaveApiRequest('POST', '/buckets', { bucketName });
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
        }
    
        // Create a new file in the bucket
        const form = new FormData();
        form.append('file', imageFile);
        form.append('description', description);
        const uploadResponse = await akaveApiRequest('POST', `/buckets/${bucketName}/files`, form, true);
        return uploadResponse.cid;
    };

    const handleCreateFeed = async () => {
        if (!account || !contract) {
            alert('Please connect your wallet first!');
            return;
        }
        if (!image) {
            alert('Please upload an image!');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('image', image);
            if (prompt) formData.append('prompt', prompt);

            const response = await axios.post(`${API_BASE_URL}/create-feed`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (!response.data.success) throw new Error(response.data.error);

            const content = response.data.content;
            console.log('Generated content:', content);

            const cid = await uploadToAkave(content);
            const tx = await contract.createFeed(cid);
            await tx.wait();

            console.log('Feed created with CID:', cid, 'Tx Hash:', tx.hash);
            setPrompt('');
            setImage(null);
            await fetchFeeds();
        } catch (error) {
            console.error('Error creating feed:', error);
            alert('Failed to create feed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchFeeds = async () => {
        if (!account || !contract) return;
        try {
            const feedsData = await contract.getFeedsByOwner(account);
            setFeeds(feedsData);
        } catch (error) {
            console.error('Error fetching feeds:', error);
            alert('Failed to fetch feeds: ' + error.message);
        }
    };

    const handleDeleteFeed = async (feedId) => {
        if (!contract) return;
        setLoading(true);
        try {
            const tx = await contract.deleteFeed(feedId);
            await tx.wait();
            console.log('Feed deleted, Tx Hash:', tx.hash);
            await fetchFeeds();
        } catch (error) {
            console.error('Error deleting feed:', error);
            alert('Failed to delete feed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log("Initializing app...");
        initializeEthers();

        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts) => {
            console.log("Accounts changed:", accounts);
            connectWallet();
        };

        const handleChainChanged = () => {
            console.log("Chain changed, reloading...");
            window.location.reload();
        };

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);

        return () => {
            window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
            window.ethereum.removeListener("chainChanged", handleChainChanged);
        };
    }, []);

    useEffect(() => {
        if (account && contract) fetchFeeds();
    }, [account, contract]);

    return (
        <div className="App">
            <h1>Feed Registry</h1>
            <div className="wallet-section">
                <button onClick={connectWallet}>
                    {!account ? "Connect Wallet" : shortenAddress(account)}
                </button>
                {networkError && (
                    <div className="w-auto m-5 p-5 absolute bg-red-500 text-white rounded-md">
                        {networkError}
                        <button
                            onClick={switchNetwork}
                            className="ml-4 p-2 outline-none rounded-md bg-blue-500"
                        >
                            Switch Network
                        </button>
                    </div>
                )}
            </div>

            <div className="create-feed">
                <h2>Create a New Feed</h2>
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter an optional prompt (e.g., 'Describe this image')"
                    disabled={loading}
                />
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loading}
                />
                <button onClick={handleCreateFeed} disabled={loading}>
                    {loading ? 'Creating...' : 'Generate & Save Feed'}
                </button>
            </div>

            <div className="feeds-section">
                <h2>Your Feeds</h2>
                {feeds.length === 0 ? (
                    <p>No feeds found for this account.</p>
                ) : (
                    <ul>
                        {feeds.map((feed, index) => (
                            <li key={index}>
                                <strong>CID:</strong> {feed.cid} <br />
                                <strong>Timestamp:</strong>{' '}
                                {new Date(feed.timestamp.toNumber() * 1000).toLocaleString()} <br />
                                <strong>Status:</strong> {feed.isDeleted ? 'Deleted' : 'Active'}
                                {!feed.isDeleted && (
                                    <button
                                        onClick={() => handleDeleteFeed(index)}
                                        disabled={loading}
                                        className="delete-button"
                                    >
                                        Delete
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default App;