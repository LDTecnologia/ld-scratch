import {defineMessages} from 'react-intl';
import sharedMessages from '../shared-messages';

let messages = defineMessages({
    robot: {
        defaultMessage: 'Robô',
        description: 'Name for the default robot sprite',
        id: 'gui.defaultProject.robot'
    },
    costumeWave: {
        defaultMessage: 'Acenando',
        description: 'Name for the waving robot costume',
        id: 'gui.defaultProject.costumeWave'
    },
    costumePoint: {
        defaultMessage: 'Apontando',
        description: 'Name for the pointing robot costume',
        id: 'gui.defaultProject.costumePoint'
    },
    costumeThink: {
        defaultMessage: 'Pensando',
        description: 'Name for the thinking robot costume',
        id: 'gui.defaultProject.costumeThink'
    },
    costumeThumb: {
        defaultMessage: 'Legal',
        description: 'Name for the thumbs-up robot costume',
        id: 'gui.defaultProject.costumeThumb'
    },
    costumeRun: {
        defaultMessage: 'Correndo',
        description: 'Name for the running robot costume',
        id: 'gui.defaultProject.costumeRun'
    },
    costumeJump: {
        defaultMessage: 'Pulando',
        description: 'Name for the jumping robot costume',
        id: 'gui.defaultProject.costumeJump'
    },
    variable: {
        defaultMessage: 'my variable',
        description: 'Name for the default variable',
        id: 'gui.defaultProject.variable'
    }
});

messages = {...messages, ...sharedMessages};

// use the default message if a translation function is not passed
const defaultTranslator = msgObj => msgObj.defaultMessage;

/**
 * Generate a localized version of the default project
 * @param {function} translateFunction a function to use for translating the default names
 * @return {object} the project data json for the default project
 */
const projectData = translateFunction => {
    const translator = translateFunction || defaultTranslator;
    return ({
        targets: [
            {
                isStage: true,
                name: 'Stage',
                variables: {
                    '`jEk@4|i[#Fk?(8x)AV.-my variable': [
                        translator(messages.variable),
                        0
                    ]
                },
                lists: {},
                broadcasts: {},
                blocks: {},
                currentCostume: 0,
                costumes: [
                    {
                        assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                        name: translator(messages.backdrop, {index: 1}),
                        md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                        dataFormat: 'svg',
                        rotationCenterX: 240,
                        rotationCenterY: 180
                    }
                ],
                sounds: [
                    {
                        assetId: '83a9787d4cb6f3b7632b4ddfebf74367',
                        name: translator(messages.pop),
                        dataFormat: 'wav',
                        format: '',
                        rate: 11025,
                        sampleCount: 258,
                        md5ext: '83a9787d4cb6f3b7632b4ddfebf74367.wav'
                    }
                ],
                volume: 100
            },
            {
                isStage: false,
                name: translator(messages.robot),
                variables: {},
                lists: {},
                broadcasts: {},
                blocks: {},
                currentCostume: 0,
                costumes: [
                    {
                        assetId: '6ad294e1ed528ba7ba08e7558e06ffb7',
                        name: translator(messages.costumeWave),
                        bitmapResolution: 1,
                        md5ext: '6ad294e1ed528ba7ba08e7558e06ffb7.png',
                        dataFormat: 'png',
                        rotationCenterX: 91,
                        rotationCenterY: 110
                    },
                    {
                        assetId: '3cd42d0b91eaeaf517054b86a22d0621',
                        name: translator(messages.costumePoint),
                        bitmapResolution: 1,
                        md5ext: '3cd42d0b91eaeaf517054b86a22d0621.png',
                        dataFormat: 'png',
                        rotationCenterX: 96,
                        rotationCenterY: 110
                    },
                    {
                        assetId: 'fc57e8bc41988fd1c4034f33e5f620e7',
                        name: translator(messages.costumeThink),
                        bitmapResolution: 1,
                        md5ext: 'fc57e8bc41988fd1c4034f33e5f620e7.png',
                        dataFormat: 'png',
                        rotationCenterX: 73,
                        rotationCenterY: 110
                    },
                    {
                        assetId: '7bb8c3bbddbe9d547af869b33e4950bf',
                        name: translator(messages.costumeThumb),
                        bitmapResolution: 1,
                        md5ext: '7bb8c3bbddbe9d547af869b33e4950bf.png',
                        dataFormat: 'png',
                        rotationCenterX: 85,
                        rotationCenterY: 110
                    },
                    {
                        assetId: '4773b425831b7b6286415fd11b3c4e7a',
                        name: translator(messages.costumeRun),
                        bitmapResolution: 1,
                        md5ext: '4773b425831b7b6286415fd11b3c4e7a.png',
                        dataFormat: 'png',
                        rotationCenterX: 91,
                        rotationCenterY: 110
                    },
                    {
                        assetId: '884994f935a614bdf06c461fefdbc3ad',
                        name: translator(messages.costumeJump),
                        bitmapResolution: 1,
                        md5ext: '884994f935a614bdf06c461fefdbc3ad.png',
                        dataFormat: 'png',
                        rotationCenterX: 103,
                        rotationCenterY: 110
                    }
                ],
                sounds: [],
                volume: 100,
                visible: true,
                x: 0,
                y: 0,
                size: 100,
                direction: 90,
                draggable: false,
                rotationStyle: 'left-right'
            }
        ],
        meta: {
            semver: '3.0.0',
            vm: '0.1.0',
            agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36' // eslint-disable-line max-len
        }
    });
};


export default projectData;
