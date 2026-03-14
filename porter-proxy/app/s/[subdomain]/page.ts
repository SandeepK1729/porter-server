import type { Metadata } from 'next';

export async function generateMetadata({
  params
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    return {
      title: rootDomain
    };
  }

  return {
    title: `${subdomain}.${rootDomain}`,
    description: `Subdomain page for ${subdomain}.${rootDomain}`
  };
}

export default async function SubdomainPage({
  params
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  
  // redirect to external URL
  return req
}
