const axios = require("axios");

// Function to fetch ETH price in USD
async function getEthPrice() {
    try {
        const response = await axios.get(
            "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        );
        return response.data.ethereum.usd; // Return the ETH price in USD
    } catch (error) {
        console.error("Error fetching ETH price:", error.message);
        return 0; // Fallback if ETH price fetch fails
    }
}

// Function to fetch Axies for sale
async function fetchAxies() {
    try {
        const apiUrl = "https://graphql-gateway.axieinfinity.com/graphql";

        const query = `
        query GetAxies($auctionType: AuctionType, $criteria: AxieSearchCriteria, $from: Int, $size: Int) {
          axies(auctionType: $auctionType, criteria: $criteria, from: $from, size: $size) {
            results {
              id
              name
              breedCount
              order {
                currentPriceUsd
                currentPrice
              }
            }
          }
        }`;

        const variables = {
            auctionType: "Sale", // Fetch Axies currently on sale
            criteria: {
                breedCount: [4, 5, 6, 7], // Breed count >= 4
            },
            from: 0,
            size: 10, // Fetch 10 results
        };

        // Fetch ETH price in USD
        const ethPriceInUsd = await getEthPrice();
        if (ethPriceInUsd === 0) {
            console.log("Could not fetch ETH price. Exiting.");
            return;
        }

        // Fetch Axies data
        const response = await axios.post(apiUrl, {
            query,
            variables,
        });

        const axies = response.data.data.axies.results;

        if (axies.length === 0) {
            console.log("No Axies found matching the query criteria.");
            return;
        }

        let found = false;
        axies.forEach((axie) => {
            const order = axie.order; // Fetch order object

            // Skip Axies without an order object
            if (!order) {
                console.log(`Axie ID ${axie.id} is not listed for sale.`);
                return;
            }

            let priceInUsd = order.currentPriceUsd; // Fetch USD price
            const priceInEthWei = order.currentPrice; // Fetch ETH price in WEI

            // Calculate ETH price if available
            const priceInEth = priceInEthWei ? priceInEthWei / 10 ** 18 : null;

            // If USD price is missing but ETH price exists, calculate USD price
            if ((!priceInUsd || isNaN(priceInUsd)) && priceInEth) {
                priceInUsd = priceInEth * ethPriceInUsd; // Calculate USD price
            }

            // Ensure priceInUsd is a valid number before using `.toFixed()`
            if (priceInUsd && !isNaN(priceInUsd)) {
                priceInUsd = parseFloat(priceInUsd); // Ensure it's a float
            } else {
                console.log(`Axie ID ${axie.id} has an invalid USD price. Displaying ETH price only.`);
                priceInUsd = null; // Reset to null for consistency
            }

            // If no price is available, skip this Axie
            if (!priceInEth) {
                console.log(`Axie ID ${axie.id} does not have a valid ETH price.`);
                return;
            }

            // Display Axie information
            found = true;
            console.log(`Axie ID: ${axie.id}`);
            console.log(`Name: ${axie.name}`);
            console.log(`Breed Count: ${axie.breedCount}`);
            if (priceInUsd) {
                console.log(`Price: ${priceInUsd.toFixed(2)} USD (${priceInEth.toFixed(5)} ETH)`);
            } else {
                console.log(`Price: ${priceInEth.toFixed(5)} ETH (USD price unavailable or invalid)`);
            }
            console.log("Link: https://marketplace.axieinfinity.com/axie/" + axie.id);
            console.log("-------------------------");
        });

        if (!found) {
            console.log("No Axies found matching the breed count and price criteria.");
        }
    } catch (error) {
        console.error("Error fetching Axies:", error.response?.data || error.message);
    }
}

// Run the function
fetchAxies();
