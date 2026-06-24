export default {
    name: 'Bilup Nova',
    description: 'An AI assistant for Bilup, based on Gandi IDE AI assistant addon.',
    credits: [
        {
            name: '白猫@CCW',
            link: 'https://www.ccw.site/student/6173f57f48cf8f4796fc860e'
        },
        {
            name: '酷可@CCW',
            link: 'https://www.ccw.site/student/610b508176415b2f27e0f851'
        },
        {
            name: 'PPN-design',
            link: 'https://github.com/ddguan2010/'
        },
        {
            name: 'RyaninCn11',
            link: 'https://github.com/RyaninCn11/'
        }
    ],
    tags: ['recommended','new'],
    enabledByDefault: true,
    userscripts: [
        {
            url: 'userscript.js',
            matches: ['projects']
        }
    ]
};
