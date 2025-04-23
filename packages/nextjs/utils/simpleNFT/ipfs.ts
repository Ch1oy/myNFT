import { create } from "kubo-rpc-client";

const JWT = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjOTU3MGI1Ni01MzVmLTRjYmEtYTYzNy04MzBmYmJjMGQ0M2YiLCJlbWFpbCI6IjEzNzUxMTk0NjhAcXEuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siaWQiOiJGUkExIiwiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjF9LHsiaWQiOiJOWUMxIiwiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjF9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImIzYWViNjU5ZGU0ODg3NmEzY2M5Iiwic2NvcGVkS2V5U2VjcmV0IjoiZjc5MDY1NmM1OTRmZDg2Y2E3YmExOTk0NzRlOWJkNTgzZGU2Yjk3YjNiZWY3YzM1ZmU4OTJjMzYzM2VlMTY3ZSIsImlhdCI6MTcxNTkxMTc4N30.ocaNOU_O62sA0M8YMG-_DvLuSlWKQHU3KXpYk-Jn7So`;

export const ipfsClient = create({
  host: "api.pinata.cloud",
  port: 443,
  protocol: "https",
  headers: {
    accept: `application/json`,
    Authorization: `Bearer ${JWT}`,
  },
});

export async function getNFTMetadataFromIPFS(ipfsHash: string) {
  for await (const file of ipfsClient.get(ipfsHash)) {
    // The file is of type unit8array so we need to convert it to string
    const content = new TextDecoder().decode(file);
    // Remove any leading/trailing whitespace
    const trimmedContent = content.trim();
    // Find the start and end index of the JSON object
    const startIndex = trimmedContent.indexOf("{");
    const endIndex = trimmedContent.lastIndexOf("}") + 1;
    // Extract the JSON object string
    const jsonObjectString = trimmedContent.slice(startIndex, endIndex);
    try {
      const jsonObject = JSON.parse(jsonObjectString);
      return jsonObject;
    } catch (error) {
      console.log("Error parsing JSON:", error);
      return undefined;
    }
  }
}
