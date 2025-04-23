"use client";
import { useState, useEffect } from "react";
import { Address, AddressInput } from "../scaffold-eth";
import { Collectible } from "./MyHoldings";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { wrapInTryCatch } from "~~/utils/scaffold-eth/common";
import { useAccount } from "wagmi";

interface NFTCardProps {
  nft: Collectible;
  onTransferSuccess: (id: number) => void;
}

export const NFTCard = ({ nft, onTransferSuccess }: NFTCardProps) => {
  const [transferToAddress, setTransferToAddress] = useState("");
  const [imageURL, setImageURL] = useState(nft.image);
  const [nftDetails, setNftDetails] = useState<Collectible>(nft);

  const { address: connectedAddress } = useAccount();

  const { writeAsync: setApprovalForAll } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "setApprovalForAll",
    args: [connectedAddress, true],
  });

  const { writeAsync: transferNFT } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "transferFrom",
    args: [nft.owner, transferToAddress, BigInt(nft.tokenId || nft.id)],
  });

  const broadcastChannel = new BroadcastChannel('nft_channel');

  useEffect(() => {
    const fetchNFTData = async () => {
      const storedNFTs = localStorage.getItem("createdNFTs");
      if (storedNFTs) {
        const nfts = JSON.parse(storedNFTs);
        const currentNFT = nfts.find((item: Collectible) => item.id === nft.id);
        if (currentNFT) {
          setImageURL(currentNFT.image);
          setNftDetails(currentNFT);
        }
      }
    };

    fetchNFTData();
  }, [nft.id]);

  const handleTransfer = async () => {
    if (!transferToAddress) {
      alert("请输入接收者地址");
      return;
    }

    // 如果当前用户不是 NFT 的所有者，需先授权
    if (connectedAddress !== nft.owner) {
      await setApprovalForAll();
    }

    // 调用智能合约的 transferNFT 方法
    await transferNFT();

    // 调用后端API更新数据库中的 owner 地址
    const response = await fetch("http://localhost:3001/updateOwner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: nft.id, // NFT的数据库ID
        newOwner: transferToAddress, // 新的owner地址
      }),
    });

    const result = await response.json();

    if (result.success) {
      // 更新成功，调用 onTransferSuccess 回调
      onTransferSuccess(nft.id);

      // 从本地存储中删除该NFT
      const storedNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
      const updatedNFTs = storedNFTs.filter((item: Collectible) => item.id !== nft.id);
      localStorage.setItem("createdNFTs", JSON.stringify(updatedNFTs));

      // 将NFT数据添加到目标地址的本地存储（可选）
      const newNFT = { ...nftDetails, owner: transferToAddress };

      // 通过 BroadcastChannel 发送数据
      broadcastChannel.postMessage(newNFT);

      alert("NFT转移成功，数据库已更新！");
    } else {
      console.error("更新数据库失败:", result.error);
      alert("转移成功，但数据库更新失败，请联系管理员！");
    }
  };


  return (
    <div className="card card-compact bg-base-100 shadow-lg sm:min-w-[300px] shadow-secondary">
      <figure className="relative">
        <img
          src={imageURL || nft.image}
          alt="NFT Image"
          className="h-60 w-full object-contain"
        />
        <figcaption className="glass absolute bottom-4 left-4 p-4 w-25 rounded-xl">
          <span className="text-pink"># {nft.id}</span>
        </figcaption>
      </figure>

      <div className="card-body space-y-3">
        <div className="flex items-center justify-center">
          <p className="text-xl p-0 m-0 font-semibold">{nftDetails.name}</p>
          <div className="flex flex-wrap space-x-2 mt-1">
            {nftDetails.attributes?.map((attr, index) => (
              <span key={index} className="badge badge-primary py-3">
                {attr.trait_type}: {attr.value}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center mt-1">
          <p className="my-0 text-lg">{nftDetails.description}</p>
        </div>
        <div className="flex space-x-3 mt-1 items-center">
          <span className="text-lg font-semibold">Owner : </span>
          <Address address={nftDetails.owner} />
        </div>
        {nftDetails.CID && (
          <div className="flex space-x-3 mt-1 items-center">
            <span className="text-lg font-semibold">CID : </span>
            <span>{nftDetails.CID}</span>
          </div>
        )}
        <div className="flex flex-col my-2 space-y-1">
          <span className="text-lg font-semibold mb-1">Transfer To: </span>
          <AddressInput
            value={transferToAddress}
            placeholder="receiver address"
            onChange={(newValue) => setTransferToAddress(newValue)}
          />
        </div>
        <div className="card-actions justify-end">
          <button
            className="btn btn-secondary btn-md px-8 tracking-wide"
            onClick={wrapInTryCatch(handleTransfer, "转移NFT时发生错误")}
            style={{ margin: "0px auto" }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};
