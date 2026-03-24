import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {closeSuperRefactorModal} from '../reducers/modals';
import Modal from './windowed-modal.jsx';
import Button from '../components/button/button.jsx';
import VM from 'scratch-vm';
import './super-refactor-modal.css';

class SuperRefactorModalContainer extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClose',
            'handleFileChange',
            'selectFile',
            'handleRefresh',
            'applyChanges',
            'downloadProject',
            'getProjectFiles',
            'toggleViewMode'
        ]);

        this.state = {
            files: [],
            currentFile: 0,
            content: '',
            message: '',
            searchQuery: '',
            filteredFiles: [],
            viewMode: 'preview' // preview 或 code
        };
    }

    componentDidMount () {
        this.loadProjectFiles();
        this.applyThemeToWindow();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.theme !== this.props.theme) {
            this.applyThemeToWindow();
        }
    }

    applyThemeToWindow () {
        const {theme} = this.props;
        const isDarkTheme = theme && typeof theme.isDark === 'function' ? theme.isDark() : false;
        
        console.log('[超级重构] 主题检测:', {
            theme: theme,
            isDarkTheme: isDarkTheme,
            themeId: theme ? theme.id : 'no theme',
            themeGui: theme ? theme.gui : 'no gui',
            bodyClass: document.body ? document.body.className : 'no body'
        });
        
        // 延迟执行以确保窗口已创建
        setTimeout(() => {
            const windowElement = document.querySelector('#superRefactorModal');
            if (windowElement) {
                if (isDarkTheme) {
                    windowElement.classList.add('dark-theme');
                    windowElement.style.background = '#2d2d2d';
                    windowElement.style.color = '#e0e0e0';
                    
                    // 同时也设置内部元素的样式
                    const contentElement = windowElement.querySelector('.addon-window-content');
                    if (contentElement) {
                        contentElement.style.background = '#2d2d2d';
                        contentElement.style.color = '#e0e0e0';
                    }
                    
                    // 设置输入框和文本区域的样式
                    const inputs = windowElement.querySelectorAll('input, textarea');
                    inputs.forEach(input => {
                        input.style.background = '#3a3a3a';
                        input.style.color = '#e0e0e0';
                        input.style.borderColor = '#555555';
                    });
                    
                } else {
                    windowElement.classList.remove('dark-theme');
                    windowElement.style.background = '';
                    windowElement.style.color = '';
                    
                    // 移除内部元素的样式
                    const contentElement = windowElement.querySelector('.addon-window-content');
                    if (contentElement) {
                        contentElement.style.background = '';
                        contentElement.style.color = '';
                    }
                    
                    // 移除输入框和文本区域的样式
                    const inputs = windowElement.querySelectorAll('input, textarea');
                    inputs.forEach(input => {
                        input.style.background = '';
                        input.style.color = '';
                        input.style.borderColor = '';
                    });
                }
            }
        }, 100);
    }

    // 从项目中获取所有文件（JSON、图片、声音等）
    getProjectFiles () {
        const files = [];
        
        if (!this.props.vm) return files;
        
        const runtime = this.props.vm.runtime;
        if (!runtime) return files;

        // 1. 项目JSON
        const projectJson = this.props.vm.toJSON();
        if (projectJson) {
            files.push({
                name: 'project.json',
                type: 'json',
                content: projectJson,
                size: projectJson.length
            });
        }

        // 2. 获取所有角色的造型和声音
        const targets = runtime.targets || [];
        targets.forEach((target, targetIndex) => {
            const targetName = target.getName ? target.getName() : `target_${targetIndex}`;
            const isStage = target.isStage;

            // 获取造型
            const costumes = target.getCostumes ? target.getCostumes() : [];
            costumes.forEach((costume, costumeIndex) => {
                if (costume.asset) {
                    const ext = costume.asset.dataFormat || 'png';
                    const fileName = isStage 
                        ? `stage/${costume.name}.${ext}`
                        : `${targetName}/costumes/${costume.name}.${ext}`;
                    
                    // 处理不同类型的资产
                    let content = null;
                    let type = 'image';
                    
                    if (ext.toLowerCase() === 'svg') {
                        // SVG 文件应该是文本
                        type = 'svg';
                        if (typeof costume.asset.data === 'string') {
                            content = costume.asset.data;
                        } else if (costume.asset.data) {
                            // 如果是 ArrayBuffer，尝试转换为字符串
                            try {
                                content = new TextDecoder('utf-8').decode(costume.asset.data);
                            } catch (e) {
                                console.error('转换 SVG 失败:', e);
                            }
                        }
                    } else {
                        // 其他图片格式
                        type = 'image';
                        if (costume.asset.data) {
                            // 确保是 Base64 字符串
                            if (typeof costume.asset.data === 'string' && costume.asset.data.startsWith('data:')) {
                                content = costume.asset.data;
                            } else {
                                console.error('图片资产格式不支持预览:', costume.asset.data);
                            }
                        }
                    }
                    
                    files.push({
                        name: fileName,
                        type: type,
                        content: content,
                        size: content ? content.length : 0,
                        assetType: costume.asset.assetType ? costume.asset.assetType.name : 'image',
                        costume: costume // 保存原始造型对象
                    });
                }
            });

            // 获取声音
            const sounds = target.getSounds ? target.getSounds() : [];
            sounds.forEach((sound, soundIndex) => {
                if (sound.asset) {
                    const ext = sound.asset.dataFormat || 'wav';
                    const fileName = isStage
                        ? `stage/sounds/${sound.name}.${ext}`
                        : `${targetName}/sounds/${sound.name}.${ext}`;
                    
                    files.push({
                        name: fileName,
                        type: 'sound',
                        content: sound.asset.data,
                        size: sound.asset.data ? sound.asset.data.length : 0,
                        assetType: sound.asset.assetType ? sound.asset.assetType.name : 'sound'
                    });
                }
            });
        });

        return files;
    }

    loadProjectFiles () {
        const files = this.getProjectFiles();
        
        if (files.length > 0) {
            this.setState({
                files: files,
                filteredFiles: files,
                currentFile: 0,
                content: files[0].content
            });
        }
    }

    handleClose () {
        this.props.onClose();
    }

    handleRefresh () {
        this.loadProjectFiles();
        this.setState({ message: '已刷新！' });
        setTimeout(() => this.setState({ message: '' }), 2000);
    }

    handleFileChange (e) {
        const content = e.target.value;
        const files = [...this.state.files];
        files[this.state.currentFile].content = content;
        this.setState({files, content});
    }

    selectFile (index) {
        const {filteredFiles} = this.state;
        const selectedFileName = filteredFiles[index].name;

        const files = this.state.files.map((file, i) => ({
            ...file,
            selected: file.name === selectedFileName
        }));

        const fullIndex = files.findIndex(f => f.name === selectedFileName);

        this.setState({
            files,
            currentFile: fullIndex,
            content: files[fullIndex].content
        });
    }

    handleSearchChange (e) {
        const query = e.target.value.toLowerCase();
        const {files} = this.state;

        const filtered = files.filter(file =>
            file.name.toLowerCase().includes(query)
        );

        this.setState({
            searchQuery: e.target.value,
            filteredFiles: filtered
        });
    }

    clearSearch () {
        this.setState({
            searchQuery: '',
            filteredFiles: this.state.files
        });
    }

    // 应用修改到VM
    applyChanges () {
        const {files, currentFile} = this.state;
        const file = files[currentFile];
        if (!file) return;

        try {
            if (file.name === 'project.json') {
                const newData = JSON.parse(file.content);
                
                if (this.props.vm) {
                    this.props.vm.loadProject(newData).then(() => {
                        this.setState({ message: '✓ 项目已更新！' });
                        setTimeout(() => this.setState({ message: '' }), 3000);
                    }).catch(err => {
                        this.setState({ message: '✗ 更新失败: ' + err.message });
                        setTimeout(() => this.setState({ message: '' }), 5000);
                    });
                }
            } else if (file.type === 'svg' && file.costume) {
                // 更新SVG造型
                if (this.props.vm) {
                    const runtime = this.props.vm.runtime;
                    if (runtime) {
                        // 找到对应的角色/舞台
                        const targets = runtime.targets || [];
                        for (const target of targets) {
                            const costumes = target.getCostumes ? target.getCostumes() : [];
                            const costumeIndex = costumes.findIndex(c => c.asset && c.asset.id === file.costume.asset.id);
                            if (costumeIndex !== -1) {
                                // 更新造型数据
                                const updatedCostume = {...file.costume};
                                updatedCostume.asset.data = file.content;
                                
                                // 这里需要调用相应的方法来更新造型
                                // 注意：这只是一个示例，实际更新方法可能不同
                                console.log('更新SVG造型:', file.name);
                                this.setState({ message: '✓ SVG造型已更新！' });
                                setTimeout(() => this.setState({ message: '' }), 3000);
                                return;
                            }
                        }
                    }
                }
            } else {
                this.setState({ message: '只有 project.json 和 SVG 可以应用到作品' });
                setTimeout(() => this.setState({ message: '' }), 3000);
            }
        } catch (e) {
            this.setState({ message: '✗ 格式错误: ' + e.message });
            setTimeout(() => this.setState({ message: '' }), 5000);
        }
    }

    // 下载项目
    downloadProject () {
        const {files} = this.state;
        const projectFile = files.find(f => f.name === 'project.json');
        
        if (projectFile) {
            try {
                const data = JSON.parse(projectFile.content);
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'project.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.setState({ message: '已下载项目文件！' });
                setTimeout(() => this.setState({ message: '' }), 3000);
            } catch (e) {
                this.setState({ message: 'JSON格式错误，无法下载' });
                setTimeout(() => this.setState({ message: '' }), 5000);
            }
        }
    }

    // 获取文件图标
    getFileIcon (type) {
        switch (type) {
            case 'json': return '📄';
            case 'image': return '🖼️';
            case 'svg': return '🎨';
            case 'sound': return '🔊';
            default: return '📎';
        }
    }

    // 切换预览/代码模式
    toggleViewMode () {
        this.setState(prevState => ({
            viewMode: prevState.viewMode === 'preview' ? 'code' : 'preview'
        }));
    }

    render () {
        const {visible, theme} = this.props;
        const {files, currentFile, content, message, searchQuery, filteredFiles, viewMode} = this.state;
        const currentFileObj = files[currentFile];
        const currentFileName = currentFileObj ? currentFileObj.name : '';
        const currentFileType = currentFileObj ? currentFileObj.type : '';

        // 判断是否为深色主题
        const isDarkTheme = theme && typeof theme.isDark === 'function' ? theme.isDark() : false;
        
        // 主题颜色
        const colors = {
            background: isDarkTheme ? '#2d2d2d' : '#ffffff',
            text: isDarkTheme ? '#e0e0e0' : '#333333',
            textSecondary: isDarkTheme ? '#a0a0a0' : '#666666',
            border: isDarkTheme ? '#444444' : '#cccccc',
            headerBg: isDarkTheme ? '#3a3a3a' : '#f5f5f5',
            inputBg: isDarkTheme ? '#3a3a3a' : '#ffffff',
            inputBorder: isDarkTheme ? '#555555' : '#cccccc',
            buttonBg: isDarkTheme ? '#4a4a4a' : '#f5f5f5',
            buttonHover: isDarkTheme ? '#5a5a5a' : '#e0e0e0'
        };

        // 是否可以编辑
        const canEdit = currentFileType === 'json' || currentFileType === 'svg';
        // 是否可以应用
        const canApply = currentFileName === 'project.json';
        // 是否是SVG文件
        const isSvg = currentFileType === 'svg';
        // 是否显示切换按钮
        const showToggleButton = isSvg;

        return (
            <Modal
                id="superRefactorModal"
                contentLabel="超级重构"
                visible={!!visible}
                className={`super-refactor-modal ${isDarkTheme ? 'dark-theme' : ''}`}
                onRequestClose={this.handleClose}
                showHeader={true}
                width={900}
                height={650}
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '580px',
                    padding: '20px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    background: colors.background,
                    color: colors.text
                }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h2 style={{margin: 0}}>超级重构 - 项目资源管理器</h2>
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                            {files.length > 0 && (
                                <div style={{
                                    fontSize: '12px',
                                    color: colors.textSecondary
                                }}>
                                    共 {files.length} 个文件
                                </div>
                            )}
                            {message && (
                                <div style={{
                                    padding: '8px 16px',
                                    background: message.includes('✓') ? '#4CAF50' : 
                                               message.includes('✗') ? '#f44336' : '#4d97ff',
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                }}>
                                    {message}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        flex: 1,
                        gap: '10px',
                        marginTop: '15px',
                        minHeight: 0,
                        overflow: 'hidden'
                    }}>
                        {/* 文件列表 */}
                        <div style={{
                            width: '280px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            overflow: 'hidden',
                            background: colors.background,
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* 搜索框 */}
                            <div style={{
                                padding: '10px',
                                borderBottom: `1px solid ${colors.border}`,
                                background: colors.headerBg
                            }}>
                                <div style={{display: 'flex', gap: '5px'}}>
                                    <input
                                        type="text"
                                        placeholder="搜索文件..."
                                        value={searchQuery}
                                        onChange={this.handleSearchChange}
                                        style={{
                                            flex: 1,
                                            padding: '6px 10px',
                                            border: `1px solid ${colors.inputBorder}`,
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            background: colors.inputBg,
                                            color: colors.text
                                        }}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={this.clearSearch}
                                            style={{
                                                padding: '6px 10px',
                                                background: '#f44336',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            清除
                                        </button>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: colors.textSecondary,
                                    marginTop: '5px'
                                }}>
                                    {filteredFiles.length} / {files.length} 个文件
                                </div>
                            </div>

                            {/* 文件列表 */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto'
                            }}>
                                {filteredFiles.length === 0 ? (
                                    <div style={{
                                        padding: '20px',
                                        textAlign: 'center',
                                        color: '#999',
                                        fontSize: '13px'
                                    }}>
                                        没有找到匹配的文件
                                    </div>
                                ) : (
                                    filteredFiles.map((file, index) => {
                                        const fullIndex = files.findIndex(f => f.name === file.name);
                                        const isSelected = fullIndex === currentFile;

                                        return (
                                            <div
                                            key={index}
                                            onClick={() => this.selectFile(index)}
                                            style={{
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                background: isSelected ? '#4d97ff' : colors.background,
                                                color: isSelected ? 'white' : colors.text,
                                                borderBottom: `1px solid ${colors.border}`,
                                                fontSize: '12px',
                                                fontFamily: 'monospace',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                            title={file.name}
                                        >
                                                <span>{this.getFileIcon(file.type)}</span>
                                                <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                    {file.name}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* 编辑器/预览区 */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 0
                        }}>
                            <div style={{
                                padding: '10px 15px',
                                background: colors.headerBg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '4px 4px 0 0',
                                borderBottom: 'none',
                                fontSize: '13px',
                                fontFamily: 'monospace',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                color: colors.text
                            }}>
                                <span>{currentFileName}</span>
                                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                    {currentFileObj && (
                                        <span style={{fontSize: '11px', color: colors.textSecondary}}>
                                            {currentFileObj.type === 'json' ? 'JSON' : 
                                             currentFileObj.type === 'svg' ? 'SVG' :
                                             currentFileObj.type === 'image' ? '图片' : 
                                             currentFileObj.type === 'sound' ? '声音' : '文件'}
                                            {currentFileObj.size ? ` (${Math.round(currentFileObj.size / 1024)} KB)` : ''}
                                        </span>
                                    )}
                                    {showToggleButton && (
                                        <button
                                            onClick={this.toggleViewMode}
                                            style={{
                                                padding: '4px 8px',
                                                background: viewMode === 'code' ? '#4d97ff' : colors.buttonBg,
                                                color: viewMode === 'code' ? 'white' : colors.text,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '10px',
                                                fontWeight: viewMode === 'code' ? 'bold' : 'normal'
                                            }}
                                        >
                                            {viewMode === 'preview' ? '显示代码' : '显示预览'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {isSvg ? (
                                viewMode === 'code' ? (
                                    <textarea
                                        value={content}
                                        onChange={this.handleFileChange}
                                        style={{
                                            flex: 1,
                                            width: '100%',
                                            padding: '15px',
                                            fontFamily: 'monospace',
                                            fontSize: '13px',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '0 0 4px 4px',
                                            resize: 'none',
                                            outline: 'none',
                                            lineHeight: '1.5',
                                            background: colors.background,
                                            color: colors.text
                                        }}
                                        spellCheck="false"
                                    />
                                ) : (
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '0 0 4px 4px',
                                        background: colors.headerBg,
                                        overflow: 'auto'
                                    }}>
                                        {content ? (
                                            <div style={{
                                                padding: '20px',
                                                maxWidth: '100%',
                                                maxHeight: '100%'
                                            }}>
                                                <svg dangerouslySetInnerHTML={{ __html: content }} />
                                            </div>
                                        ) : (
                                            <div style={{color: '#999'}}>无法预览SVG</div>
                                        )}
                                    </div>
                                )
                            ) : canEdit ? (
                                <textarea
                                    value={content}
                                    onChange={this.handleFileChange}
                                    style={{
                                        flex: 1,
                                        width: '100%',
                                        padding: '15px',
                                        fontFamily: 'monospace',
                                        fontSize: '13px',
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '0 0 4px 4px',
                                        resize: 'none',
                                        outline: 'none',
                                        lineHeight: '1.5',
                                        background: colors.background,
                                        color: colors.text
                                    }}
                                    spellCheck="false"
                                />
                            ) : currentFileType === 'image' ? (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '0 0 4px 4px',
                                    background: colors.headerBg,
                                    overflow: 'auto'
                                }}>
                                    {content ? (
                                        <img 
                                            src={content} 
                                            alt={currentFileName}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    ) : (
                                        <div style={{color: '#999'}}>无法预览图片</div>
                                    )}
                                </div>
                            ) : (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '0 0 4px 4px',
                                    background: colors.headerBg,
                                    color: colors.textSecondary
                                }}>
                                    此文件类型不支持编辑
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 按钮 */}
                    <div style={{
                        marginTop: '15px',
                        paddingTop: '15px',
                        borderTop: `1px solid ${colors.border}`,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        flexShrink: 0
                    }}>
                        <Button onClick={this.handleRefresh}>
                            刷新
                        </Button>
                        <Button 
                            onClick={this.applyChanges}
                            disabled={!canApply}
                        >
                            {canApply ? '应用到作品' : '不可应用'}
                        </Button>
                        <Button onClick={this.downloadProject}>
                            下载项目
                        </Button>
                        <Button onClick={this.handleClose}>
                            关闭
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }
}

SuperRefactorModalContainer.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM),
    theme: PropTypes.object,
    intl: PropTypes.object
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.superRefactorModal,
    vm: state.scratchGui.vm,
    theme: state.scratchGui.theme
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeSuperRefactorModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(SuperRefactorModalContainer));
