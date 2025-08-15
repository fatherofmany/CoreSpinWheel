import { ShieldCheck, Crown, Lock, BarChart3, TrendingUp, Zap } from 'lucide-react';

const powers = [
  {
    title: 'Governance Rights',
    description: 'Vote on future spin multipliers, event themes, and protocol direction—even before TGE.',
    icon: <ShieldCheck className="w-6 h-6 text-purple-600" />,
    gradient: 'from-purple-100 to-purple-300',
  },
  {
    title: 'Exclusive Tiers',
    description: 'Unlock Diamond Spins, Platinum Skin Drops, and Legendary Challenges reserved for top Cr holders.',
    icon: <Crown className="w-6 h-6 text-yellow-500" />,
    gradient: 'from-yellow-100 to-yellow-300',
  },
  {
    title: 'Pre-TGE Whitelisting',
    description: 'Get automatic access to NFT airdrops, token pre-sales, and private access events.',
    icon: <Lock className="w-6 h-6 text-blue-600" />,
    gradient: 'from-blue-100 to-blue-300',
  },
  {
    title: 'Spin Yield Boosters',
    description: 'Stake Cr to multiply your spin rewards. Lock 1000 Cr = +1.1x yield multiplier.',
    icon: <Zap className="w-6 h-6 text-green-600" />,
    gradient: 'from-green-100 to-green-300',
  },
  {
    title: 'Top 10 Leaderboard Recognition',
    description: 'Gain badges, public visibility, and permanent on-chain fame for topping weekly charts.',
    icon: <TrendingUp className="w-6 h-6 text-red-500" />,
    gradient: 'from-red-100 to-red-300',
  },
  {
    title: 'Seasonal Control',
    description: 'Propose and vote on seasonal game modes, special streak rules, and Cr reward structures.',
    icon: <BarChart3 className="w-6 h-6 text-indigo-600" />,
    gradient: 'from-indigo-100 to-indigo-300',
  }
];

export default function CrScorecards() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {powers.map((power, i) => (
        <div key={i} className={`bg-gradient-to-br ${power.gradient} rounded-xl p-5 shadow-md`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white rounded-full shadow">{power.icon}</div>
            <h4 className="text-lg font-bold text-gray-800">{power.title}</h4>
          </div>
          <p className="text-sm text-gray-700">{power.description}</p>
        </div>
      ))}
    </div>
  );
}
