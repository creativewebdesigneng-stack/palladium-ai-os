import {createFileRoute} from '@tanstack/react-router';
import DropshippingHub from '@/screens/DropshippingHub';
import DropshippingConnectionMatrix from '@/screens/DropshippingConnectionMatrix';
import DropshippingGrowthLab from '@/screens/DropshippingGrowthLab';
import DropshippingProductPipeline from '@/screens/DropshippingProductPipeline';
import DropshippingListingWorkbench from '@/screens/DropshippingListingWorkbench';
import DropshippingControlTower from '@/screens/DropshippingControlTower';
import DropshippingAutomationPack from '@/screens/DropshippingAutomationPack';

function DropshippingHubRoute(){
  return <>
    <DropshippingHub/>
    <DropshippingConnectionMatrix/>
    <DropshippingGrowthLab/>
    <DropshippingProductPipeline/>
    <DropshippingListingWorkbench/>
    <DropshippingControlTower/>
    <DropshippingAutomationPack/>
  </>;
}

export const Route=createFileRoute('/_shell/_app/dropshipping-hub')({component:DropshippingHubRoute});
