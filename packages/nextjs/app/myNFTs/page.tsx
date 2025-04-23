"use client";

import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { MyHoldings } from "~~/components/simpleNFT";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

interface NftInfo {
  image: string;
  id: number;
  name: string;
  attributes: { trait_type: string; value: string }[];
  author: string;
  owner: string;
  price: string;
  description: string;
  CID?: string;
  tokenId?: number;
  status?: string;
  leasestatus?: string;
}

const MyNFTs: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();

  const [nftInfo, setNftInfo] = useState<NftInfo>({
    image: "",
    id: Date.now(),
    name: "",
    attributes: [],
    author: connectedAddress || "",
    owner: connectedAddress || "",
    price: "0.00",
    description: "",
    status: "未上架",
    leasestatus: "未租赁",
  });
  const [createdNFTs, setCreatedNFTs] = useState<NftInfo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 盲盒相关的状态
  const [mysteryBoxPrice, setMysteryBoxPrice] = useState<string>("0.1");
  const [newMysteryBoxPrice, setNewMysteryBoxPrice] = useState<string>("0.1");
  const [nftToAddToBox, setNftToAddToBox] = useState<number | null>(null);

  // 状态来存储已经添加到盲盒中的NFT TokenId
  const [mysteryBoxTokens, setMysteryBoxTokens] = useState<number[]>([]);

  const { writeAsync: mintItem } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "mintItem",
    args: [connectedAddress, ""],
  });

  const { data: tokenIdCounter } = useScaffoldContractRead({
    contractName: "YourCollectible",
    functionName: "tokenIdCounter",
    watch: true,
    cacheOnBlock: true,
  });

  const { writeAsync: setMysteryBoxPriceTx } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "setMysteryBoxPrice",
    args: [BigInt(parseFloat(newMysteryBoxPrice) * 10 ** 18)], // 将小数转换为整数（假设单位为 10^18）
  });

  const { writeAsync: addNftToMysteryBox } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "addAvailableToken",
    args: [nftToAddToBox !== null ? BigInt(nftToAddToBox) : undefined], // 只转换 nftToAddToBox
  });

  const handleNftInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNftInfo({
      ...nftInfo,
      [name]: name === "attributes" ? value.split(",").map((attr) => ({ trait_type: name, value: attr })) : value,
    });
  };

  const handleMintItem = async () => {
    const { image, id, name, attributes, author, owner, price, description, status, leasestatus } = nftInfo;
    if (image === "") {
      notification.error("请提供图片链接");
      return;
    }

    const notificationId = notification.loading("上传至IPFS中...");
    try {
      const uploadedItem = await addToIPFS({ image, id, name, attributes, owner, price, description });
      notification.remove(notificationId);
      notification.success("数据已上传到IPFS中");

      if (tokenIdCounter !== undefined) {
        const mintTx = await mintItem({
          args: [connectedAddress, uploadedItem.path],
        });

        const newTokenId = Number(tokenIdCounter) + 1;

        const newNftInfo: NftInfo = {
          ...nftInfo,
          id: newTokenId,
          owner: connectedAddress || "",
          CID: uploadedItem.CID,
          tokenId: newTokenId,
        };

        setCreatedNFTs((prevNFTs) => {
          const updatedNFTs = [...prevNFTs, newNftInfo];
          localStorage.setItem("createdNFTs", JSON.stringify(updatedNFTs));
          return updatedNFTs;
        });

        // 调用后端 API 保存 NFT 数据到数据库
        const response = await fetch("http://localhost:3001/api/createNFT", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...newNftInfo,
            attributes: newNftInfo.attributes.map((attr) => attr.value),
          }),
        });
        const result = await response.json();
        if (response.ok) {
          notification.success("NFT 数据已保存到数据库");
        } else {
          notification.error(`保存数据库失败: ${result.message}`);
        }

        // 清空 NFT 信息
        setNftInfo({
          image: "",
          id: Date.now(),
          name: "",
          attributes: [],
          owner: connectedAddress || "",
          author: connectedAddress || "",
          price: "0.00",
          description: "",
        });

        // 显示 tokenId
        notification.success(`NFT 创建成功，Token ID: ${newTokenId}`);
      } else {
        notification.error("无法获取TokenIdCounter");
      }
    } catch (error) {
      notification.remove(notificationId);
      console.error("上传IPFS出错: ", error);
    }
  };

  const handleSetMysteryBoxPrice = async () => {
    if (!newMysteryBoxPrice || isNaN(Number(newMysteryBoxPrice))) {
      notification.error("请输入有效的价格");
      return;
    }

    const tx = await setMysteryBoxPriceTx();
    notification.success("盲盒价格已更新");
  };

  const handleAddNftToMysteryBox = async () => {
    if (nftToAddToBox === null) {
      notification.error("请选择要添加到盲盒的NFT");
      return;
    }

    // 检查NFT是否已经存在于盲盒中
    if (mysteryBoxTokens.includes(nftToAddToBox)) {
      notification.error("此NFT已经在盲盒中");
      return;
    }

    const tx = await addNftToMysteryBox();
    setMysteryBoxTokens((prevTokens) => {
      const updatedTokens = [...prevTokens, nftToAddToBox];
      // 保存到 localStorage
      localStorage.setItem("mysteryBoxTokens", JSON.stringify(updatedTokens));
      return updatedTokens;
    });

    notification.success(`NFT ${nftToAddToBox} 已添加到盲盒`);
  };

  useEffect(() => {
    const storedNFTs = localStorage.getItem("createdNFTs");
    if (storedNFTs) {
      setCreatedNFTs(JSON.parse(storedNFTs));
    }

    // 读取盲盒中已存在的NFT TokenId列表
    const storedTokens = localStorage.getItem("mysteryBoxTokens");
    if (storedTokens) {
      setMysteryBoxTokens(JSON.parse(storedTokens));
    }
  }, [connectedAddress]);

  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">我的NFT列表</span>
          </h1>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <button className="btn btn-secondary" onClick={() => setIsModalOpen(true)}>
          创建NFT
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-lg relative">
            <button className="absolute right-3 top-3 text-lg" onClick={() => setIsModalOpen(false)} style={{ color: "black" }}>
              -
            </button>
            <div>
              <input
                type="text"
                name="image"
                placeholder="NFT 链接"
                className="border p-2 w-200 mb-4 block mx-auto"
                value={nftInfo.image}
                onChange={handleNftInfoChange}
              />
              <input
                type="text"
                name="name"
                placeholder="NFT 名称"
                className="border p-2 w-200 mb-4 block mx-auto"
                value={nftInfo.name}
                onChange={handleNftInfoChange}
              />
              <input
                type="text"
                name="attributes"
                placeholder="NFT 属性（用逗号分隔）"
                className="border p-2 w-200 mb-4 block mx-auto"
                value={nftInfo.attributes.map((attr) => attr.value).join(",")}
                onChange={handleNftInfoChange}
              />
              <input
                type="text"
                name="description"
                placeholder="NFT 描述信息"
                className="border p-2 w-200 mb-4 block mx-auto"
                value={nftInfo.description}
                onChange={handleNftInfoChange}
              />
            </div>
            <div className="flex justify-center mt-4">
              <button
                className="btn btn-secondary mr-4"
                onClick={() => {
                  setIsModalOpen(false);
                  setNftInfo({
                    image: "",
                    id: Date.now(),
                    name: "",
                    attributes: [],
                    owner: connectedAddress || "",
                    author: connectedAddress || "",
                    description: "",
                    price: "0.00",
                  });
                }}
              >
                取消
              </button>
              <div className="flex justify-center">
                {!isConnected || isConnecting ? (
                  <RainbowKitCustomConnectButton />
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      handleMintItem();
                      setIsModalOpen(false);
                    }}
                  >
                    创建 NFT
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mt-8 text-center">
        <h2>设置盲盒价格</h2>
        <input
          type="text"
          className="border p-2 w-200 mb-4"
          value={newMysteryBoxPrice}
          onChange={(e) => setNewMysteryBoxPrice(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleSetMysteryBoxPrice}>
          设置盲盒价格
        </button>
      </div>
      <div className="mt-8 text-center">
        <h2>向盲盒添加NFT</h2>
        <select
          className="border p-2 mb-4"
          onChange={(e) => setNftToAddToBox(Number(e.target.value))}
        >
          <option value="">选择一个NFT</option>
          {createdNFTs
            .filter((nft) => nft.owner === connectedAddress) // 只显示属于当前用户的NFT
            .map((nft) => (
              <option key={nft.tokenId} value={nft.tokenId}>
                {nft.name} (Token ID: {nft.tokenId})
              </option>
            ))}
        </select>

        <button className="btn btn-primary" onClick={handleAddNftToMysteryBox}>
          添加到盲盒
        </button>
      </div>

      <MyHoldings />
    </>
  );
};

export default MyNFTs;
