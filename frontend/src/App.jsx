import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FormData from 'form-data';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import FeedRegistryABI from './assets/FeedRegistryABI.json';
import './App.css';

const API_BASE_URL = 'http://localhost:5000';
const AKAVE_API_BASE_URL = 'http://localhost:8000';
const CONTRACT_ADDRESS = '0x45E762AFA6178b82Efbcb3d685bEBF023E2ef6b1';

function App() {
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [feeds, setFeeds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();

    const { data: feedsData, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FeedRegistryABI,
        functionName: 'getFeedsByOwner',
        args: [address],
        enabled: !!address,
    });

    // Update feeds when data changes
    useEffect(() => {
        if (feedsData) {
            setFeeds(feedsData);
        }
    }, [feedsData]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // const uploadToAkave = async (content, description) => {
    //     const bucketName = `feed-${address.slice(0, 8)}`;
    //     try {
    //         await axios.post(`${AKAVE_API_BASE_URL}/buckets`, { bucketName: bucketName })
    //             .catch(error => {
    //                 if (!error.response?.data?.error?.includes('already exists')) throw error;
    //             });

    //         const form = new FormData();
    //         form.append('file', new Blob([content], { type: 'text/plain' }), `feed-${Date.now()}.txt`);
    //         form.append('description', description || 'Generated feed content');

    //         const response = await axios.post(
    //             `${AKAVE_API_BASE_URL}/buckets/${bucketName}/files`, 
    //             form, 
    //             { headers: form.getHeaders ? form.getHeaders() : {} }
    //         );

    //         return response.data.cid;
    //     } catch (error) {
    //         console.error('Error uploading to Akave:', error);
    //         throw new Error(error.response?.data?.error || error.message);
    //     }
    // };

    // const uploadToAkave = async (content, description) => {
    //     console.log('Starting uploadToAkave:', {
    //         contentLength: content?.length,
    //         description: description || 'No description provided',
    //         address: address || 'No address provided',
    //     });

    //     if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    //         console.error('Invalid wallet address:', address);
    //         throw new Error('Invalid wallet address');
    //     }

    //     if (!content) {
    //         console.error('No content provided for upload');
    //         throw new Error('Content is required');
    //     }

    //     const bucketName = `feed${address.slice(0, 8)}`;
    //     console.log('Computed bucketName:', bucketName);

    //     try {
    //         console.log('Attempting to create bucket:', {
    //             url: `${AKAVE_API_BASE_URL}/buckets`,
    //             payload: { bucketName },
    //         });

    //         const bucketResponse = await axios.post(`${AKAVE_API_BASE_URL}/buckets`, { bucketName })
    //             .catch(error => {
    //                 console.error('Bucket creation error:', {
    //                     status: error.response?.status,
    //                     errorMessage: error.response?.data?.error,
    //                     fullError: error.message,
    //                 });
    //                 if (
    //                     error.response?.status === 409 ||
    //                     error.response?.data?.error?.toLowerCase().includes('already exists')
    //                 ) {
    //                     console.log('Bucket already exists, proceeding with file upload');
    //                     return;
    //                 }
    //                 throw error;
    //             });

    //         console.log('Bucket creation response:', bucketResponse?.data || 'No response (bucket already exists)');

    //         console.log('Preparing file upload:', {
    //             bucketName,
    //             fileName: `feed-${Date.now()}.txt`,
    //             description: description || 'Generated feed content',
    //         });

    //         const form = new FormData();
    //         form.append('file', new Blob([content], { type: 'text/plain' }), `feed-${Date.now()}.txt`);
    //         form.append('description', description || 'Generated feed content');

    //         console.log('FormData prepared for upload:', {
    //             url: `${AKAVE_API_BASE_URL}/buckets/${bucketName}/files`,
    //         });

    //         const response = await axios.post(`${AKAVE_API_BASE_URL}/buckets/${bucketName}/files`, form);

    //         console.log('File upload response:', {
    //             status: response.status,
    //             data: response.data,
    //             cid: response.data.cid,
    //         });

    //         const cid = response.data?.data?.RootCID;
    //         if (!cid) {
    //             console.error('No CID returned in response');
    //             throw new Error('Invalid response: CID not found');
    //         }
    //         return cid;


    //         // return response.data.data.RootCid;
    //     } catch (error) {
    //         console.error('Error in uploadToAkave:', {
    //             errorMessage: error.message,
    //             responseStatus: error.response?.status,
    //             responseData: error.response?.data,
    //             responseError: error.response?.data?.error,
    //             stack: error.stack,
    //         });

    //         const errorMessage =
    //             error.response?.status === 500
    //                 ? 'Server error: Failed to process bucket creation. Check server logs or contact support.'
    //                 : error.response?.data?.error || error.message;
    //         throw new Error(errorMessage);
    //     }
    // };

    const uploadToAkave = async (content, description) => {
        console.log('Starting uploadToAkave:', {
            contentLength: content?.length,
            description: description || 'No description provided',
            address: address || 'No address provided',
        });
    
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            console.error('Invalid wallet address:', address);
            throw new Error('Invalid wallet address');
        }
    
        if (!content) {
            console.error('No content provided for upload');
            throw new Error('Content is required');
        }
    
        // Ensure content meets minimum size requirement (127 bytes)
        if (content.length < 127) {
            console.error('Content too small:', content.length);
            throw new Error('Content must be at least 127 bytes');
        }
    
        const bucketName = `feed${address.slice(0, 8)}`;
        console.log('Computed bucketName:', bucketName);
    
        try {
            // Step 1: Check if the bucket exists
            console.log('Checking for existing buckets:', {
                url: `${AKAVE_API_BASE_URL}/buckets`,
            });
    
            const listBucketsResponse = await axios.get(`${AKAVE_API_BASE_URL}/buckets`);
            console.log('List buckets response:', {
                status: listBucketsResponse.status,
                data: listBucketsResponse.data,
            });
    
            // Extract buckets from response
            const buckets = listBucketsResponse.data?.data || [];
            const bucketExists = buckets.some((bucket) => bucket.Name === bucketName);
    
            // Step 2: Create bucket if it doesn't exist
            if (!bucketExists) {
                console.log('Bucket does not exist, creating bucket:', {
                    url: `${AKAVE_API_BASE_URL}/buckets`,
                    payload: { bucketName },
                });
    
                try {
                    const bucketResponse = await axios.post(`${AKAVE_API_BASE_URL}/buckets`, {
                        bucketName,
                    });
                    console.log('Bucket creation response:', {
                        status: bucketResponse.status,
                        data: bucketResponse.data,
                    });
                } catch (bucketError) {
                    console.error('Bucket creation failed:', {
                        status: bucketError.response?.status,
                        error: bucketError.response?.data?.error,
                        message: bucketError.message,
                    });
                    if (
                        bucketError.response?.status === 409 ||
                        bucketError.response?.data?.error?.toLowerCase().includes('already exists')
                    ) {
                        console.log('Bucket already exists (confirmed by error), proceeding with file upload');
                    } else {
                        throw bucketError;
                    }
                }
            } else {
                console.log(`Bucket '${bucketName}' already exists, proceeding with file upload`);
            }
    
            // Step 3: Upload the file
            console.log('Preparing file upload:', {
                bucketName,
                fileName: `feed-${Date.now()}.txt`,
                description: description || 'Generated feed content',
            });
    
            // Use browser's native FormData
            const form = new FormData();
            form.append('file', new Blob([content], { type: 'text/plain' }), `feed-${Date.now()}.txt`);
            form.append('description', description || 'Generated feed content');
    
            console.log('FormData prepared for upload:', {
                url: `${AKAVE_API_BASE_URL}/buckets/${bucketName}/files`,
            });
    
            const uploadResponse = await axios.post(
                `${AKAVE_API_BASE_URL}/buckets/${bucketName}/files`,
                form
                // No headers needed; axios handles multipart/form-data automatically
            );
    
            console.log('File upload response:', {
                status: uploadResponse.status,
                data: uploadResponse.data,
            });
    
            // Extract CID from response
            const cid = uploadResponse.data?.data?.RootCID;
            if (!cid) {
                console.error('No CID returned in response:', uploadResponse.data);
                throw new Error('Invalid response: CID not found');
            }
    
            console.log('File uploaded successfully, CID:', cid);
            return cid;
    
        } catch (error) {
            console.error('Error in uploadToAkave:', {
                errorMessage: error.message,
                responseStatus: error.response?.status,
                responseData: error.response?.data,
                responseError: error.response?.data?.error,
                stack: error.stack,
            });
    
            const errorMessage =
                error.response?.status === 500
                    ? 'Server error: Failed to process request. Check server logs or contact support.'
                    : error.response?.data?.error || error.message;
            throw new Error(errorMessage);
        }
    };

    const handleCreateFeed = async (e) => {
        e.preventDefault();

        if (!address) {
            setError('Please connect your wallet first!');
            return;
        }

        if (!image) {
            setError('Please upload an image!');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const formData = new FormData();
            formData.append('image', image);
            if (prompt) formData.append('prompt', prompt);

            // Send to backend for processing
            const response = await axios.post(`${API_BASE_URL}/create-feed`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (!response.data.success) throw new Error(response.data.error);

            // Get generated content
            const content = response.data.content;
            console.log('Generated content:', content);

            // Upload to Akave storage
            const cid = await uploadToAkave(content, prompt || 'Generated feed');

            // Create feed on blockchain using writeContractAsync
            const transaction = await writeContractAsync({
                address: CONTRACT_ADDRESS,
                abi: FeedRegistryABI,
                functionName: 'createFeed',
                args: [cid]
            });

            console.log('Transaction submitted:', transaction);

            // Reset form
            setPrompt('');
            setImage(null);
            setImagePreview(null);
            setSuccess('Feed created successfully!');

            // Refresh feeds
            refetch();

        } catch (error) {
            console.error('Error creating feed:', error);
            setError(`Failed to create feed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFeed = async (feedId) => {
        setLoading(true);
        setError('');
        try {
            const transaction = await writeContractAsync({
                address: CONTRACT_ADDRESS,
                abi: FeedRegistryABI,
                functionName: 'deleteFeed',
                args: [feedId]
            });

            console.log('Delete transaction submitted:', transaction);
            setSuccess('Feed deleted successfully!');

            // Refresh feeds after a short delay to allow transaction confirmation
            setTimeout(() => refetch(), 2000);
        } catch (error) {
            console.error('Error deleting feed:', error);
            setError(`Failed to delete feed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Format date from timestamp
    const formatDate = (timestamp) => {
        return new Date(Number(timestamp) * 1000).toLocaleString();
    };

    // Clear notifications after 5 seconds
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError('');
                setSuccess('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    return (
        <div className="app-container">
            <header>
                <h1>Feed Registry</h1>
                <div className="connect-wallet">
                    <ConnectButton />
                </div>
            </header>

            {(error || success) && (
                <div className={`notification ${error ? 'error' : 'success'}`}>
                    {error || success}
                </div>
            )}

            <main>
                <section className="create-feed-section">
                    <h2>Create a New Feed</h2>
                    <form onSubmit={handleCreateFeed}>
                        <div className="form-group">
                            <label htmlFor="prompt">Description (Optional)</label>
                            <input
                                id="prompt"
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Enter a description or prompt for your feed"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group file-input-group">
                            <label htmlFor="image-upload">
                                Upload Image
                                <input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    disabled={loading}
                                />
                                <div className="upload-button">
                                    Choose File
                                </div>
                            </label>
                            {imagePreview && (
                                <div className="image-preview">
                                    <img src={imagePreview} alt="Preview" />
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="create-button"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Generate & Save Feed'}
                        </button>
                    </form>
                </section>

                <section className="feeds-section">
                    <h2>Your Feeds</h2>
                    {!address ? (
                        <p className="connect-message">Connect your wallet to view your feeds</p>
                    ) : feeds && feeds.length > 0 ? (
                        <div className="feeds-list">
                            {feeds.map((feed, index) => (
                                <div
                                    key={index}
                                    className={`feed-card ${feed.isDeleted ? 'deleted' : ''}`}
                                >
                                    <div className="feed-content">
                                        <div className="feed-header">
                                            <span className="label">Status:</span>
                                            <span className={`status ${feed.isDeleted ? 'inactive' : 'active'}`}>
                                                {feed.isDeleted ? 'Deleted' : 'Active'}
                                            </span>
                                        </div>
                                        <div className="feed-details">
                                            <div>
                                                <span className="label">CID:</span>
                                                <span className="value">{feed.cid}</span>
                                            </div>
                                            <div>
                                                <span className="label">Created:</span>
                                                <span className="value">{formatDate(feed.timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {!feed.isDeleted && (
                                        <button
                                            onClick={() => handleDeleteFeed(index)}
                                            disabled={loading}
                                            className="delete-button"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-feeds">No feeds found for this account</p>
                    )}
                </section>
            </main>

            <footer>
                <p>&copy; {new Date().getFullYear()} Feed Registry | Powered by IPFS & Filecoin</p>
            </footer>
        </div>
    );
}

export default App;