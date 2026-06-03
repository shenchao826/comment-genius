import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

const DEFAULT_TITLE = '评语助手 - AI赋能每一位教师';
const DEFAULT_DESCRIPTION = '专为K12班主任设计的AI评语生成工具，10秒生成有温度的个性化学生评语，支持批量处理、多种风格模板';
const DEFAULT_OG_IMAGE = '/og-image.png';
const SITE_URL = 'https://teachers.minicode.cloud';

export default function SEO({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
  canonicalUrl,
  noIndex = false
}: SEOProps) {
  const fullTitle = title ? `${title} | 评语助手` : DEFAULT_TITLE;
  const fullDescription = description || DEFAULT_DESCRIPTION;
  const fullOgImage = ogImage ? `${SITE_URL}${ogImage}` : `${SITE_URL}${DEFAULT_OG_IMAGE}`;
  const fullCanonical = canonicalUrl ? `${SITE_URL}${canonicalUrl}` : SITE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="评语助手" />
      <meta property="og:locale" content="zh_CN" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullOgImage} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonical} />
      
      {/* No Index for dev/staging */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Additional SEO meta tags */}
      <meta name="author" content="Minicode" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="theme-color" content="#2563eb" />
      <link rel="icon" type="image/png" href="/favicon.ico" />
    </Helmet>
  );
}
