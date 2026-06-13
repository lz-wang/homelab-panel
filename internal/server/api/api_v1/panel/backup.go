package panel

import (
	"encoding/json"
	"homelab-panel/internal/app/global"
	"homelab-panel/internal/server/api/api_v1/common/apiReturn"
	"homelab-panel/internal/server/api/api_v1/common/base"
	"homelab-panel/internal/store/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"gorm.io/gorm"
)

type Backup struct {
}

type backupGroupWithItems struct {
	Group models.ItemIconGroup `json:"group"`
	Items []models.ItemIcon    `json:"items"`
}

type backupPayloadV1 struct {
	Version    int                    `json:"version"`
	ExportedAt string                 `json:"exportedAt"`
	Panel      map[string]interface{} `json:"panel"`
	Groups     []backupGroupWithItems `json:"groups"`
}

type backupImportStats struct {
	GroupCount int `json:"groupCount"`
	ItemCount  int `json:"itemCount"`
}

func (a *Backup) Export(c *gin.Context) {
	userInfo, _ := base.GetCurrentUserInfo(c)
	cfg := models.UserConfig{}
	panel := map[string]interface{}{}

	if err := global.Db.First(&cfg, "user_id=?", userInfo.ID).Error; err != nil && err != gorm.ErrRecordNotFound {
		apiReturn.ErrorDatabase(c, err.Error())
		return
	}

	if cfg.PanelJson != "" {
		if err := json.Unmarshal([]byte(cfg.PanelJson), &panel); err != nil {
			apiReturn.ErrorDatabase(c, err.Error())
			return
		}
	}

	groups := []models.ItemIconGroup{}
	if err := global.Db.Order("sort ,created_at").Where("user_id=?", userInfo.ID).Find(&groups).Error; err != nil {
		apiReturn.ErrorDatabase(c, err.Error())
		return
	}

	respGroups := make([]backupGroupWithItems, 0, len(groups))
	for _, group := range groups {
		items := []models.ItemIcon{}

		if err := global.Db.Order("sort ,created_at").Find(&items, "item_icon_group_id = ? AND user_id=?", group.ID, userInfo.ID).Error; err != nil {
			apiReturn.ErrorDatabase(c, err.Error())
			return
		}

		for k := range items {
			_ = json.Unmarshal([]byte(items[k].IconJson), &items[k].Icon)
		}

		respGroups = append(respGroups, backupGroupWithItems{
			Group: group,
			Items: items,
		})
	}

	apiReturn.SuccessData(c, backupPayloadV1{
		Version:    1,
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Panel:      panel,
		Groups:     respGroups,
	})
}

func (a *Backup) Import(c *gin.Context) {
	userInfo, _ := base.GetCurrentUserInfo(c)
	req := backupPayloadV1{}

	if err := c.ShouldBindBodyWith(&req, binding.JSON); err != nil {
		apiReturn.ErrorParamFomat(c, err.Error())
		return
	}

	if req.Version != 1 {
		apiReturn.ErrorParamFomat(c, "Unsupported backup version")
		return
	}

	stats := backupImportStats{}
	txErr := global.Db.Transaction(func(tx *gorm.DB) error {
		panelJSON, err := json.Marshal(req.Panel)
		if err != nil {
			return err
		}

		existingConfig := models.UserConfig{}
		if err := tx.First(&existingConfig, "user_id=?", userInfo.ID).Error; err != nil {
			if err != gorm.ErrRecordNotFound {
				return err
			}

			if err := tx.Create(&models.UserConfig{
				UserId:    userInfo.ID,
				PanelJson: string(panelJSON),
			}).Error; err != nil {
				return err
			}
		} else if err := tx.Where("user_id=?", userInfo.ID).Updates(&models.UserConfig{
			PanelJson: string(panelJSON),
		}).Error; err != nil {
			return err
		}

		for _, entry := range req.Groups {
			group := models.ItemIconGroup{
				Icon:        entry.Group.Icon,
				Title:       entry.Group.Title,
				Description: entry.Group.Description,
				Sort:        entry.Group.Sort,
				UserId:      userInfo.ID,
			}

			if err := tx.Create(&group).Error; err != nil {
				return err
			}
			stats.GroupCount += 1

			items := make([]models.ItemIcon, 0, len(entry.Items))
			for _, item := range entry.Items {
				iconJSON, err := json.Marshal(item.Icon)
				if err != nil {
					return err
				}

				items = append(items, models.ItemIcon{
					Icon:            item.Icon,
					IconJson:        string(iconJSON),
					Title:           item.Title,
					Url:             item.Url,
					LanUrl:          item.LanUrl,
					Description:     item.Description,
					OpenMethod:      item.OpenMethod,
					Sort:            item.Sort,
					ItemIconGroupId: int(group.ID),
					UserId:          userInfo.ID,
				})
			}

			if len(items) > 0 {
				if err := tx.Create(&items).Error; err != nil {
					return err
				}
				stats.ItemCount += len(items)
			}
		}

		return nil
	})

	if txErr != nil {
		apiReturn.ErrorDatabase(c, txErr.Error())
		return
	}

	apiReturn.SuccessData(c, stats)
}
