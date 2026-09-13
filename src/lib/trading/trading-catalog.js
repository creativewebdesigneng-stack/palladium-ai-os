export const TRADING_ASSET_CLASSES = [
  {
    id: 'equities',
    name: 'Equities',
    description: 'Listed shares, depositary receipts, sectors, factors, corporate actions, earnings and equity-index context.',
    focus: ['cash equities', 'ADRs / GDRs', 'sectors', 'factors', 'earnings', 'corporate actions'],
  },
  {
    id: 'etfs',
    name: 'ETFs & ETPs',
    description: 'Exchange-traded funds and products across index, thematic, commodity, bond and multi-asset exposures.',
    focus: ['index ETFs', 'bond ETFs', 'commodity ETPs', 'thematic', 'leveraged / inverse'],
  },
  {
    id: 'fx',
    name: 'Foreign exchange',
    description: 'Major, minor and emerging-market currency pairs, central-bank catalysts and cross-currency risk.',
    focus: ['spot FX', 'forwards', 'NDFs', 'carry', 'central banks', 'crosses'],
  },
  {
    id: 'rates',
    name: 'Rates & fixed income',
    description: 'Government and corporate bonds, yield curves, rates futures, credit spreads and duration risk.',
    focus: ['sovereign debt', 'corporates', 'yield curves', 'credit', 'rates futures', 'duration'],
  },
  {
    id: 'commodities',
    name: 'Commodities & futures',
    description: 'Energy, metals, agriculture and financial futures with contract, roll, margin and delivery awareness.',
    focus: ['energy', 'metals', 'agriculture', 'futures curves', 'roll yield', 'margin'],
  },
  {
    id: 'options',
    name: 'Options & volatility',
    description: 'Listed options, implied volatility, Greeks, term structure and defined-risk strategy research.',
    focus: ['calls / puts', 'Greeks', 'IV', 'skew', 'term structure', 'defined risk'],
  },
  {
    id: 'digital-assets',
    name: 'Digital assets',
    description: 'Crypto spot and derivatives research with venue, custody, liquidity, stablecoin and regulatory risk made explicit.',
    focus: ['spot', 'perpetuals', 'futures', 'custody', 'stablecoins', 'on-chain context'],
  },
];

export const TRADING_SESSIONS = [
  { name: 'Asia-Pacific', reference: 'Tokyo · Hong Kong · Singapore · Sydney', note: 'Session hours, auctions, holidays and daylight-saving treatment vary by venue.' },
  { name: 'Europe', reference: 'London · Paris · Frankfurt · Zurich', note: 'Use the venue calendar and instrument rulebook as the authoritative source.' },
  { name: 'North America', reference: 'New York · Chicago · Toronto', note: 'Pre/post-market access and derivative sessions differ from regular cash-market hours.' },
  { name: '24-hour / near-24-hour markets', reference: 'FX · selected futures · digital assets', note: 'Continuous access does not mean continuous liquidity; spreads and depth can change materially by session.' },
];

export const GLOBAL_TRADING_VENUES = [
  { name: 'London Stock Exchange', region: 'United Kingdom', kind: 'Equities / ETFs / bonds', url: 'https://www.londonstockexchange.com/' },
  { name: 'NYSE', region: 'United States', kind: 'Equities / ETFs', url: 'https://www.nyse.com/' },
  { name: 'Nasdaq', region: 'United States', kind: 'Equities / ETFs / options', url: 'https://www.nasdaq.com/' },
  { name: 'CME Group', region: 'United States', kind: 'Futures / options', url: 'https://www.cmegroup.com/' },
  { name: 'Cboe Global Markets', region: 'United States', kind: 'Options / equities / futures / FX', url: 'https://www.cboe.com/' },
  { name: 'Intercontinental Exchange', region: 'Global', kind: 'Futures / equities / fixed income', url: 'https://www.ice.com/' },
  { name: 'TMX Group', region: 'Canada', kind: 'Equities / derivatives', url: 'https://www.tmx.com/' },
  { name: 'Euronext', region: 'Europe', kind: 'Equities / ETFs / derivatives / bonds', url: 'https://www.euronext.com/' },
  { name: 'Deutsche Börse Group', region: 'Germany / Europe', kind: 'Equities / derivatives / market infrastructure', url: 'https://www.deutsche-boerse.com/' },
  { name: 'SIX Swiss Exchange', region: 'Switzerland', kind: 'Equities / ETFs / bonds', url: 'https://www.six-group.com/en/products-services/the-swiss-stock-exchange.html' },
  { name: 'Japan Exchange Group', region: 'Japan', kind: 'Equities / derivatives', url: 'https://www.jpx.co.jp/english/' },
  { name: 'Hong Kong Exchanges and Clearing', region: 'Hong Kong', kind: 'Equities / derivatives / commodities', url: 'https://www.hkex.com.hk/' },
  { name: 'Singapore Exchange', region: 'Singapore', kind: 'Equities / derivatives / FX / commodities', url: 'https://www.sgx.com/' },
  { name: 'Australian Securities Exchange', region: 'Australia', kind: 'Equities / ETFs / derivatives / bonds', url: 'https://www.asx.com.au/' },
  { name: 'National Stock Exchange of India', region: 'India', kind: 'Equities / derivatives / debt', url: 'https://www.nseindia.com/' },
  { name: 'BSE', region: 'India', kind: 'Equities / derivatives / debt', url: 'https://www.bseindia.com/' },
  { name: 'Johannesburg Stock Exchange', region: 'South Africa', kind: 'Equities / derivatives / bonds', url: 'https://www.jse.co.za/' },
  { name: 'B3', region: 'Brazil', kind: 'Equities / derivatives / fixed income', url: 'https://www.b3.com.br/en_us/' },
];

export const TRADING_AUTHORITIES = [
  { name: 'Financial Conduct Authority', region: 'United Kingdom', kind: 'Markets / firms / conduct', url: 'https://www.fca.org.uk/' },
  { name: 'Bank of England', region: 'United Kingdom', kind: 'Monetary policy / financial stability', url: 'https://www.bankofengland.co.uk/' },
  { name: 'U.S. Securities and Exchange Commission', region: 'United States', kind: 'Securities markets', url: 'https://www.sec.gov/' },
  { name: 'Commodity Futures Trading Commission', region: 'United States', kind: 'Derivatives markets', url: 'https://www.cftc.gov/' },
  { name: 'Federal Reserve', region: 'United States', kind: 'Monetary policy / financial system', url: 'https://www.federalreserve.gov/' },
  { name: 'European Securities and Markets Authority', region: 'European Union', kind: 'Securities / markets', url: 'https://www.esma.europa.eu/' },
  { name: 'European Central Bank', region: 'Euro area', kind: 'Monetary policy / banking system', url: 'https://www.ecb.europa.eu/' },
  { name: 'Bank for International Settlements', region: 'Global', kind: 'Central-bank / market research', url: 'https://www.bis.org/' },
];

export const TRADER_WORKFLOWS = [
  { title: 'Discover', description: 'Find instruments, venues, themes, macro catalysts and market structure before building a thesis.' },
  { title: 'Research', description: 'Combine primary sources, market context, fundamentals, technical observations and scenario analysis.' },
  { title: 'Plan', description: 'Define entry logic, invalidation, target, time horizon, liquidity constraints and maximum acceptable loss.' },
  { title: 'Size risk', description: 'Translate a risk budget and stop distance into a position size before any order is considered.' },
  { title: 'Simulate', description: 'Paper-test or backtest with real observations and explicit assumptions before live execution.' },
  { title: 'Execute through controls', description: 'Live integrations should use Blackstar permissions, approvals and broker-specific safeguards rather than bypassing governance.' },
  { title: 'Journal', description: 'Record the thesis, execution quality, outcome, mistakes and process adherence—not just P&L.' },
  { title: 'Review', description: 'Measure expectancy, drawdown, hit rate, payoff ratio, concentration and whether the process is repeatable.' },
];
