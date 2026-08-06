export const ORGANIZATION_GROUPS = [
  { label: '東京U', schools: ['早稲田', '上板橋駅前', '要町', '豊玉'] },
  { label: '埼玉U', schools: ['和光', '志木駅前', '鶴瀬'] },
  { label: '薬院', schools: ['薬院'] },
  { label: '西新', schools: ['西新修猷館前'] },
  { label: '福岡中央U', schools: ['大橋駅前', '長住', '六本松'] },
  { label: '福岡西U', schools: ['原', '橋本', '前原駅前'] },
  { label: '福岡南U', schools: ['西鉄久留米', '小郡', '都府楼前', '井尻'] },
  { label: '福岡東U', schools: ['香椎', '和白', '古賀駅前', '東郷', '赤間'] },
  { label: '北九州U', schools: ['西小倉駅前', '荒生田', '戸畑', '八幡', '折尾駅前', '高須', '下曽根', '守恒駅前'] },
  { label: '門司下関U', schools: ['門司駅前', '安岡', '長府駅前'] },
  { label: '駿台DiverseU', schools: ['小倉駅'] },
  { label: 'ヴィクセルアカデミーU', schools: ['新宮中央', '箱崎', '志免南里'] },
  { label: '佐賀U', schools: ['佐賀駅前', '本庄大崎', '鳥栖'] },
  { label: '長崎U', schools: ['長崎駅前', '城栄', '南長崎', '住吉', '葉山'] },
  { label: '熊本U', schools: ['水前寺', '健軍', '武蔵ヶ丘', '長嶺'] },
  { label: '大分U', schools: ['大分駅前本高等部', '春日', '南大分', '光吉', '戸次', '明野'] },
  { label: '宮崎U', schools: ['宮崎駅前', '生目大塚', '花ヶ島', '赤江'] },
  { label: '鹿児島U', schools: ['鹿児島中央', '紫原', '宇宿', '東谷山', '慈眼寺'] },
  { label: '広島北U', schools: ['白島', '緑井', '上安', '中広'] },
  { label: '広島南U', schools: ['広島駅前', '中筋', '古江', '皆実町', '安芸府中'] },
  { label: '岡山駅前U', schools: ['岡山駅前', 'HS岡山駅前'] },
  { label: '岡山北U', schools: ['岡北', '伊島', '津高'] },
  { label: '岡山南U', schools: ['国富', '西古松', '高島駅南口'] },
  { label: '高松U', schools: ['栗林', '木太南', '水田', '番町'] },
];

export const ALL_SCHOOLS = [...new Set(['みらいミッテ栗林', ...ORGANIZATION_GROUPS.flatMap(group => group.schools)])];
export const UNIT_OPTIONS = ORGANIZATION_GROUPS.map(group => group.label);
