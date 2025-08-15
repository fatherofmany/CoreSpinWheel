import { useState, useEffect } from "react";
import { ethers } from "ethers";
import LuckyWheelABI from "../contracts/LuckyWheel.json";

const LUCKY_WHEEL_ADDRESS = "0x166A7BD00F0cF5BE9be0C592dA092cB7e7C2Af6d"; 

export const useLuckyWheel = (signer) => {
  const [contract, setContract] = useState(null);
  const [wheelData, setWheelData] = useState({
    cost: null,
    history: [],
    lastPrize: null,
    spinning: false,
  });

  // ✅ Instantiate contract
  useEffect(() => {
    if (!signer) return;
    const instance = new ethers.Contract(LUCKY_WHEEL_ADDRESS, LuckyWheelABI, signer);
    setContract(instance);
  }, [signer]);

  // ✅ Fetch spin cost
  const fetchCost = async () => {
    if (!contract) return;
    const cost = await contract.spinCost();
    setWheelData(prev => ({ ...prev, cost }));
  };

  // ✅ Spin
  const spinWheel = async () => {
    if (!contract) return;

    try {
      setWheelData(prev => ({ ...prev, spinning: true }));

      const tx = await contract.spin({ value: wheelData.cost });
      const receipt = await tx.wait();

      // Optional: parse emitted event for prize
      const event = receipt.logs.find(log =>
        log.topics[0] === contract.interface.getEventTopic("PrizeWon")
      );
      const decoded = contract.interface.decodeEventLog("PrizeWon", event.data, event.topics);
      const prize = decoded.prizeAmount;

      setWheelData(prev => ({
        ...prev,
        lastPrize: prize,
        spinning: false,
        history: [prize, ...prev.history],
      }));

      return prize;
    } catch (err) {
      console.error("Spin failed", err);
      setWheelData(prev => ({ ...prev, spinning: false }));
    }
  };

  return {
    ...wheelData,
    spinWheel,
    fetchCost,
  };
};
