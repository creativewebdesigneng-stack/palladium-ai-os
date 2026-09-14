import {createFileRoute} from '@tanstack/react-router';
import DropshippingHub from '@/screens/DropshippingHub';
import DropshippingGrowthLab from '@/screens/DropshippingGrowthLab';

function DropshippingHubRoute(){
  return <>
    <DropshippingHub/>
    <DropshippingGrowthLab/>
  </>;
}

export const Route=createFileRoute('/_shell/_app/dropshipping-hub')({component:DropshippingHubRoute});
