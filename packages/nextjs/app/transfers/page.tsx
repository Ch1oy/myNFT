"use client";

import type { NextPage } from "next";
import { useState, useEffect } from "react";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldContractRead } from "~~/hooks/scaffold-eth";


// 交易历史结构
interface TransactionHistory {
  seller: string;
  buyer: string;
  price: string;
  timestamp: string;
}

const Transfers: NextPage = () => {
  const { data: transferEvents, isLoading } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "Transfer",
    fromBlock: 0n,
  });

  const [tokenId, setTokenId] = useState<string>("");
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // 使用钩子读取交易历史数据
  const { data: tokenTransactionHistory } = useScaffoldContractRead({
    contractName: "YourCollectible",
    functionName: "getTokenTransactionHistory",
    args: [tokenId ? BigInt(tokenId) : 0n],   // 动态传递tokenId
    watch: false,  // 不需要持续监听
  });

  // 只有在点击搜索时，才更新交易历史数据
  useEffect(() => {
    if (tokenTransactionHistory && isModalOpen) {
      setTransactionHistory(tokenTransactionHistory);
    }
  }, [tokenTransactionHistory, isModalOpen]);

  const handleSearch = () => {
    if (!tokenId) {
      alert("请输入有效的tokenId");
      return;
    }
    setTransactionHistory([]);  // 清空之前的历史记录
    setIsModalOpen(true);  // 打开弹窗
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-xl"></span>
      </div>
    );

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        {/* 搜索框部分 */}
        <div className="mb-5">
          <input
            type="number"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="请输入tokenId"
            className="input input-bordered"
          />
          <button onClick={handleSearch} className="btn btn-primary ml-2">
            查询
          </button>
        </div>

        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">所有转移事件</span>
          </h1>
        </div>
        <div className="overflow-x-auto shadow-lg">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="bg-primary">tokenId</th>
                <th className="bg-primary">From</th>
                <th className="bg-primary">To</th>
              </tr>
            </thead>
            <tbody>
              {!transferEvents || transferEvents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center">
                    没有发现事件
                  </td>
                </tr>
              ) : (
                transferEvents?.map((event, index) => (
                  <tr key={index}>
                    <th className="text-center">{event.args.tokenId?.toString()}</th>
                    <td>
                      <Address address={event.args.from} />
                    </td>
                    <td>
                      <Address address={event.args.to} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 弹窗显示交易历史 */}
        {isModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-5 rounded-lg w-1/3">
              <h2 className="text-xl font-bold mb-4">交易历史</h2>
              <button
                className="btn btn-secondary mb-4"
                onClick={() => setIsModalOpen(false)}
              >
                关闭
              </button>
              <div>
                {transactionHistory.length === 0 ? (
                  <p>没有找到该tokenId的交易历史。</p>
                ) : (
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>卖家</th>
                        <th>买家</th>
                        <th>价格</th>
                        <th>时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionHistory.map((history, index) => (
                        <tr key={index}>
                          <td>
                            <Address address={history.seller} />
                          </td>
                          <td>
                            <Address address={history.buyer} />
                          </td>
                          <td>{(Number(history.price) / 1e18).toFixed(4)} ETH</td>
                          <td>{new Date(Number(history.timestamp) * 1000).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Transfers;
