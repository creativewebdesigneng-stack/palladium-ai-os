import {createFileRoute} from '@tanstack/react-router';
import DropshippingHub from '@/screens/DropshippingHub';
import DropshippingGrowthLab from '@/screens/DropshippingGrowthLab';
import DropshippingOpportunityPipeline from '@/screens/DropshippingOpportunityPipeline';

function DropshippingHubRoute(){
  return <>
    <DropshippingHub/>
    <DropshippingGrowthLab/>
    <DropshippingOpportunityPipeline/>
  </>;
}

export const Route=createFileRoute('/_shell/_app/dropshipping-hub')({component:DropshippingHubRoute});
