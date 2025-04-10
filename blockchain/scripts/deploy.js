async function main() {
    const Feed = await ethers.getContractFactory("FeedRegistry");
    const feed = await Feed.deploy();
    await feed.waitForDeployment();
    console.log("FeedRegistry deployed to:", feed.target);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });