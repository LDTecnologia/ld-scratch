import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, intlShape, injectIntl, FormattedMessage} from 'react-intl';

import Box from '../box/box.jsx';
import ActionMenu from '../action-menu/action-menu.jsx';
import DeleteButton from '../delete-button/delete-button.jsx';
import styles from './stage-selector.css';
import {isRtl} from 'scratch-l10n';

import backdropIcon from '../action-menu/icon--backdrop.svg';
import fileUploadIcon from '../action-menu/icon--file-upload.svg';
import paintIcon from '../action-menu/icon--paint.svg';
import surpriseIcon from '../action-menu/icon--surprise.svg';
import searchIcon from '../action-menu/icon--search.svg';

const messages = defineMessages({
    addBackdropFromLibrary: {
        id: 'gui.spriteSelector.addBackdropFromLibrary',
        description: 'Button to add a stage in the target pane from library',
        defaultMessage: 'Choose a Backdrop'
    },
    addBackdropFromPaint: {
        id: 'gui.stageSelector.addBackdropFromPaint',
        description: 'Button to add a stage in the target pane from paint',
        defaultMessage: 'Paint'
    },
    addBackdropFromSurprise: {
        id: 'gui.stageSelector.addBackdropFromSurprise',
        description: 'Button to add a random stage in the target pane',
        defaultMessage: 'Surprise'
    },
    addBackdropFromFile: {
        id: 'gui.stageSelector.addBackdropFromFile',
        description: 'Button to add a stage in the target pane from file',
        defaultMessage: 'Upload Backdrop'
    }
});

const StageSelector = props => {
    const {
        backdropCount,
        containerRef,
        dragOver,
        fileInputRef,
        intl,
        selected,
        raised,
        tile,
        costumes,
        currentCostume,
        onSelectCostume,
        onDeleteCostume,
        receivedBlocks,
        url,
        onBackdropFileUploadClick,
        onBackdropFileUpload,
        onClick,
        onMouseEnter,
        onMouseLeave,
        onNewBackdropClick,
        onSurpriseBackdropClick,
        onEmptyBackdropClick,
        ...componentProps
    } = props;
    const tiles = Array.isArray(costumes) ? costumes.map((costume, index) => ({
        index: index,
        name: costume.name,
        url: costume.asset && typeof costume.asset.encodeDataURI === 'function' ?
            costume.asset.encodeDataURI() : ''
    })) : [];
    return (
        <Box
            className={classNames(styles.stageSelector, {
                [styles.isSelected]: selected,
                [styles.raised]: raised || dragOver,
                [styles.receivedBlocks]: receivedBlocks,
                [styles.tile]: tile
            })}
            componentRef={containerRef}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            {...componentProps}
        >
            {tile ? (
                <div className={styles.backdropGrid}>
                    {tiles.map(item => (
                        <div
                            key={item.index}
                            className={classNames(styles.backdropCard, {
                                [styles.backdropOn]: item.index === currentCostume
                            })}
                            role="button"
                            tabIndex={0}
                            onClick={event => onSelectCostume(item.index, event)}
                            onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onSelectCostume(item.index, event);
                                }
                            }}
                        >
                            {item.url ? (
                                <img
                                    alt=""
                                    className={styles.backdropThumb}
                                    draggable={false}
                                    src={item.url}
                                />
                            ) : null}
                            <span className={styles.backdropName}>{item.name}</span>
                            {tiles.length > 1 && onDeleteCostume ? (
                                <DeleteButton
                                    className={styles.backdropDelete}
                                    onClick={event => onDeleteCostume(item.index, event)}
                                />
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : (
                <React.Fragment>
                    <div className={styles.header}>
                        <div className={styles.headerTitle}>
                            <FormattedMessage
                                defaultMessage="Stage"
                                description="Label for the stage in the stage selector"
                                id="gui.stageSelector.stage"
                            />
                        </div>
                    </div>
                    {url ? (
                        <img
                            className={styles.costumeCanvas}
                            src={url}
                        />
                    ) : null}
                    <div className={styles.label}>
                        <FormattedMessage
                            defaultMessage="Backdrops"
                            description="Label for the backdrops in the stage selector"
                            id="gui.stageSelector.backdrops"
                        />
                    </div>
                    <div className={styles.count}>{backdropCount}</div>
                </React.Fragment>
            )}
            <ActionMenu
                className={styles.addButton}
                img={backdropIcon}
                moreButtons={[
                    {
                        title: intl.formatMessage(messages.addBackdropFromFile),
                        img: fileUploadIcon,
                        onClick: onBackdropFileUploadClick,
                        fileAccept: '.svg, .png, .bmp, .jpg, .jpeg, .gif',
                        fileChange: onBackdropFileUpload,
                        fileInput: fileInputRef,
                        fileMultiple: true
                    }, {
                        title: intl.formatMessage(messages.addBackdropFromSurprise),
                        img: surpriseIcon,
                        onClick: onSurpriseBackdropClick

                    }, {
                        title: intl.formatMessage(messages.addBackdropFromPaint),
                        img: paintIcon,
                        onClick: onEmptyBackdropClick
                    }, {
                        title: intl.formatMessage(messages.addBackdropFromLibrary),
                        img: searchIcon,
                        onClick: onNewBackdropClick
                    }
                ]}
                title={intl.formatMessage(messages.addBackdropFromLibrary)}
                tooltipPlace={isRtl(intl.locale) ? 'right' : 'left'}
                onClick={onNewBackdropClick}
            />
        </Box>
    );
};

StageSelector.propTypes = {
    backdropCount: PropTypes.number.isRequired,
    containerRef: PropTypes.func,
    costumes: PropTypes.arrayOf(PropTypes.shape({
        asset: PropTypes.object,
        name: PropTypes.string
    })),
    currentCostume: PropTypes.number,
    dragOver: PropTypes.bool,
    fileInputRef: PropTypes.func,
    intl: intlShape.isRequired,
    onBackdropFileUpload: PropTypes.func,
    onBackdropFileUploadClick: PropTypes.func,
    onClick: PropTypes.func,
    onDeleteCostume: PropTypes.func,
    onEmptyBackdropClick: PropTypes.func,
    onMouseEnter: PropTypes.func,
    onMouseLeave: PropTypes.func,
    onNewBackdropClick: PropTypes.func,
    onSurpriseBackdropClick: PropTypes.func,
    raised: PropTypes.bool.isRequired,
    receivedBlocks: PropTypes.bool.isRequired,
    selected: PropTypes.bool.isRequired,
    tile: PropTypes.bool,
    url: PropTypes.string,
    onSelectCostume: PropTypes.func
};

export default injectIntl(StageSelector);
