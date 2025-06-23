import { Shield, MessageCircle, DollarSign } from "lucide-react"
import SpotlightCard from './SportLightCard';


const cardData = [
  {
    title: '24/7',
    description: 'Support Available',
    icon: <MessageCircle size={40} />,
    
  },
  {
    title: '100%',
    description: 'Confidential',
    icon: <Shield size={40}  />,
  },
  {
    title: 'Free',
    description: 'All Services',
    icon: <DollarSign size={40} />,
  },
];

const Statistics = () => {
  return (
    <div className='max-w-6xl mx-auto px-4 sm:py-14 lg:py-18'>
        <h2 className="text-3xl sm:text-5xl font-bold text-center my-10">Making a Difference Together</h2>
      <SpotlightCard cards={cardData} />
    </div>
  );
};

export default Statistics;

