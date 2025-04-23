// your-pinata-utils.ts

export async function uploadToPinata(file: File): Promise<any> {
  const pinataApiKey = "b3aeb659de48876a3cc9";
  const pinataSecretApiKey = "f790656c594fd86ca7ba199474e9bd583de6b97b3bef7c35fe892c3633ee167e";

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataSecretApiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("上传到 Pinata 出错");
  }

  const data = await response.json();
  return data;
}
