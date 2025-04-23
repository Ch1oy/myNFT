const JWT = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjOTU3MGI1Ni01MzVmLTRjYmEtYTYzNy04MzBmYmJjMGQ0M2YiLCJlbWFpbCI6IjEzNzUxMTk0NjhAcXEuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siaWQiOiJGUkExIiwiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjF9LHsiaWQiOiJOWUMxIiwiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjF9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImIzYWViNjU5ZGU0ODg3NmEzY2M5Iiwic2NvcGVkS2V5U2VjcmV0IjoiZjc5MDY1NmM1OTRmZDg2Y2E3YmExOTk0NzRlOWJkNTgzZGU2Yjk3YjNiZWY3YzM1ZmU4OTJjMzYzM2VlMTY3ZSIsImlhdCI6MTcxNTkxMTc4N30.ocaNOU_O62sA0M8YMG-_DvLuSlWKQHU3KXpYk-Jn7So`;
let CID: string; // 定义 CID 变量用于存储 IpfsHash
const fetchFromApi = ({ path, method, body, }: { path: string; method: string; body?: object }) => {
  const headers = {
    "Content-Type": "application/json",
    ...(body ? { "Authorization": `Bearer ${JWT}` } : {}),
  };

  return fetch(path, {
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log(data); // 打印获取到的数据
      return data; // 返回数据以继续链式调用
    })
    .catch(error => console.error("Error:", error));
};

export const addToIPFS = (yourJSON: object) => {
  return fetchFromApi({
    path: `https://api.pinata.cloud/pinning/pinJSONToIPFS`,
    method: "POST",
    body: {
      pinataMetadata: { name: "nftsMetadata.json" },
      pinataContent: yourJSON,
    },
  }).then(data => {
    const CID = data.IpfsHash; // 获取返回的 IpfsHash
    console.log(CID);
    return { ...data, CID }; // 返回数据和 CID 以继续链式调用
  });
};


// export const getMetadataFromIPFS = (ipfsHash: string) => {
//   return fetchFromApi({
//     path: `/api/ipfs/get-metadata`,
//     method: "POST",
//     body: { ipfsHash },
//   });
// };
export const getMetadataFromIPFS = async (CID: any) => {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${CID}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data from IPFS:", error);
    throw error;
  }
};

