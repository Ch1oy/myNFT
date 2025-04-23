"use client";

import { useState, useEffect } from "react";
import { Pagination } from "antd";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { ethers } from "ethers";
import { notification } from "~~/utils/scaffold-eth";
import { useAccount } from "wagmi";

interface Collectible {
  image: string;
  id: number;
  name: string;
  attributes: { trait_type: string; value: string }[];
  owner: string;
  description: string;
  CID: string;
  rentPrice: number;  // 租赁价格
  duration: number;   // 租赁时长
  rented: boolean;    // 新增字段：表示NFT是否已租赁
  originalOwner?: string;  // 新增字段：存储原始所有者地址
}


const RentedNFTs = () => {
  const [rentedNFTs, setRentedNFTs] = useState<Collectible[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const { address: connectedAddress } = useAccount();

  // 合约调用
  const { writeAsync: rentNFT } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "rentNFT",
    args: [0n],  // 默认参数，后面会动态传入
    value: 0n, // 默认租金，后面会动态传入
  });

  const { writeAsync: endRental } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "endRental",
    args: [0n],  // 默认参数，后面会动态传入
  });

  useEffect(() => {
    // 从本地存储中获取已租赁的 NFT
    const storedRentedNFTs = JSON.parse(localStorage.getItem("rentedNFTs") || "[]");
    setRentedNFTs(storedRentedNFTs);
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRent = async (nft: Collectible) => {
    try {
      const rentPriceInWei = ethers.parseUnits(nft.rentPrice.toString(), "ether").toString(); 

      console.log('Renting NFT with tokenId:', nft.id, 'and value:', rentPriceInWei);

      // 调用智能合约进行租赁
       await rentNFT({
        args: [BigInt(nft.id)],  // 传入NFT的tokenId
        value: BigInt(rentPriceInWei), // 传入租金
      });

      //更新租赁状态，修改按钮状态
      const updatedRentedNFTs = rentedNFTs.map(item =>
        item.id === nft.id ? { ...item, rented: true, originalOwner: item.owner } : item
      );
      setRentedNFTs(updatedRentedNFTs);

      // 获取createdNFTs并更新该NFT的owner为租赁者
      const createdNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
      const updatedCreatedNFTs = createdNFTs.map((item: Collectible) =>
        item.id === nft.id ? { ...item, owner: connectedAddress } : item // 更新为当前账户地址
      );
      localStorage.setItem("createdNFTs", JSON.stringify(updatedCreatedNFTs));

      // 更新本地存储中的租赁状态
      localStorage.setItem("rentedNFTs", JSON.stringify(updatedRentedNFTs));
    
      notification.success("NFT租赁成功！" );
    } catch (error) {
      console.error(error);
      notification.error("NFT租赁失败！" );
    }
  };

  const handleEndRental = async (nft: Collectible) => {
    try {
      // 调用合约结束租赁
      await endRental({
        args: [BigInt(nft.id)],  // 传入NFT的tokenId
      });

      // 更新租赁状态，删除该NFT
      const updatedRentedNFTs = rentedNFTs.filter(item => item.id !== nft.id);
      setRentedNFTs(updatedRentedNFTs);

      // 获取createdNFTs并恢复该NFT的owner为原始所有者
      const createdNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
      const updatedCreatedNFTs = createdNFTs.map((item: Collectible) =>
        item.id === nft.id ? { ...item, owner: nft.originalOwner || item.owner } : item // 恢复为原始所有者地址
      );
      localStorage.setItem("createdNFTs", JSON.stringify(updatedCreatedNFTs));


      // 更新本地存储中的租赁状态
      localStorage.setItem("rentedNFTs", JSON.stringify(updatedRentedNFTs));

      notification.success("NFT租赁已结束！");
    } catch (error) {
      console.error(error);
      notification.error("结束租赁失败！");
    }
  };

  const paginatedRentedNFTs = rentedNFTs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">NFT租赁</span>
        </h1>
    </div>
      {rentedNFTs.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-2xl text-primary-content">No rented NFTs found</div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 my-8 px-5 justify-center">
          {paginatedRentedNFTs.map((item) => (
            <div key={item.id} className="card card-compact bg-base-100 shadow-lg sm:min-w-[300px]">
              <figure className="relative">
                <img src={item.image} alt="NFT Image" className="h-60 w-full object-contain" />
                <figcaption className="glass absolute bottom-4 left-4 p-4 w-25 rounded-xl">
                  <span className="text-pink"># {item.id}</span>
                </figcaption>
              </figure>
              <div className="card-body space-y-3">
                <div className="flex items-center justify-center">
                  <p className="text-xl p-0 m-0 font-semibold">NFT名称：{item.name}</p>
                  <div className="flex flex-wrap space-x-2 mt-1">
                    {item.attributes.map((attr, index) => (
                      <span key={index} className="badge badge-primary py-3">
                        {attr.trait_type}: {attr.value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-center mt-1">
                  <p className="my-0 text-lg">描述：{item.description}</p>
                </div>
                <div className="flex space-x-3 mt-1 items-center">
                  <span className="text-lg font-semibold">发布者 : </span>
                  
                  <Address address={item.owner} />
                </div>
                {item.CID && (
                  <div className="flex space-x-3 mt-1 items-center">
                    <span className="text-lg font-semibold">CID : </span>
                    <span>{item.CID}</span>
                  </div>
                )}
                <div className="flex flex-col my-2 space-y-1">
                  <span className="text-lg font-semibold mb-1">租金: </span>
                  <span>{item.rentPrice} ETH</span>
                  <span className="text-lg font-semibold mb-1">租赁时长: </span>
                  <span>{item.duration} 天</span>
                </div>
                <div className="card-actions justify-center">
                  {!item.rented ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleRent(item)} // 点击时调用租赁方法
                    >
                      租赁
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleEndRental(item)} // 点击时调用结束租赁方法
                    >
                      结束租赁
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination
        current={currentPage}
        pageSize={itemsPerPage}
        total={rentedNFTs.length}
        onChange={handlePageChange}
        style={{ marginTop: "2rem", textAlign: "center" }}
      />
    </>
  );
};

export default RentedNFTs;
