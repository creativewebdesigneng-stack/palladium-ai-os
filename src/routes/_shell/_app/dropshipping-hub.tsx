import {createFileRoute} from '@tanstack/react-router';
import DropshippingHub from '@/screens/DropshippingHub';
import DropshippingGrowthLab from '@/screens/DropshippingGrowthLab';
import DropshippingProductPipeline from '@/screens/DropshippingProductPipeline';
import DropshippingListingWorkbench from '@/screens/DropshippingListingWorkbench';

function DropshippingHubRoute(){
  return <>
    <DropshippingHub/>
    <DropshippingGrowthLab/>
    <DropshippingProductPipeline/>
    <DropshippingListingWorkbench/>
  </>;
}

export const Route=createFileRoute('/_shell/_app/dropshipping-hub')({component:DropshippingHubRoute});
