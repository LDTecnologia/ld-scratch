import projectData from './project-data';

/* eslint-disable import/no-unresolved */
import popWav from '!arraybuffer-loader!./83a9787d4cb6f3b7632b4ddfebf74367.wav?';
import backdrop from '!raw-loader!./cd21514d0531fdffb22204e0ec5ed84a.svg?';
import costumeWave from '!arraybuffer-loader!./6ad294e1ed528ba7ba08e7558e06ffb7.png?';
import costumePoint from '!arraybuffer-loader!./3cd42d0b91eaeaf517054b86a22d0621.png?';
import costumeThink from '!arraybuffer-loader!./fc57e8bc41988fd1c4034f33e5f620e7.png?';
import costumeThumb from '!arraybuffer-loader!./7bb8c3bbddbe9d547af869b33e4950bf.png?';
import costumeRun from '!arraybuffer-loader!./4773b425831b7b6286415fd11b3c4e7a.png?';
import costumeJump from '!arraybuffer-loader!./884994f935a614bdf06c461fefdbc3ad.png?';
/* eslint-enable import/no-unresolved */

const defaultProject = translator => {
    let _TextEncoder;
    if (typeof TextEncoder === 'undefined') {
        _TextEncoder = require('fastestsmallesttextencoderdecoder').TextEncoder;
    } else {
        _TextEncoder = TextEncoder;
    }
    const encoder = new _TextEncoder();

    const projectJson = projectData(translator);
    return [{
        id: 0,
        assetType: 'Project',
        dataFormat: 'JSON',
        data: JSON.stringify(projectJson)
    }, {
        id: '83a9787d4cb6f3b7632b4ddfebf74367',
        assetType: 'Sound',
        dataFormat: 'WAV',
        data: new Uint8Array(popWav)
    }, {
        id: 'cd21514d0531fdffb22204e0ec5ed84a',
        assetType: 'ImageVector',
        dataFormat: 'SVG',
        data: encoder.encode(backdrop)
    }, {
        id: '6ad294e1ed528ba7ba08e7558e06ffb7',
        assetType: 'ImageBitmap',
        dataFormat: 'PNG',
        data: new Uint8Array(costumeWave)
    }, {
        id: '3cd42d0b91eaeaf517054b86a22d0621',
        assetType: 'ImageBitmap',
        dataFormat: 'PNG',
        data: new Uint8Array(costumePoint)
    }, {
        id: 'fc57e8bc41988fd1c4034f33e5f620e7',
        assetType: 'ImageBitmap',
        dataFormat: 'PNG',
        data: new Uint8Array(costumeThink)
    }, {
        id: '7bb8c3bbddbe9d547af869b33e4950bf',
        assetType: 'ImageBitmap',
        dataFormat: 'PNG',
        data: new Uint8Array(costumeThumb)
    }, {
        id: '4773b425831b7b6286415fd11b3c4e7a',
        assetType: 'ImageBitmap',
        dataFormat: 'PNG',
        data: new Uint8Array(costumeRun)
    }, {
        id: '884994f935a614bdf06c461fefdbc3ad',
        assetType: 'ImageBitmap',
        dataFormat: 'PNG',
        data: new Uint8Array(costumeJump)
    }];
};

export default defaultProject;
